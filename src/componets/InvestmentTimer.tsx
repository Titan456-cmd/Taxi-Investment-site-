import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Bell } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InvestmentTimerProps {
  investment: {
    id: string;
    plan_name: string;
    amount: number;
    daily_earning: number;
    total_days: number;
    days_completed: number;
    total_earned: number;
    start_date: string;
    maturity_date: string;
    last_earning_date: string | null;
    status: string;
  };
  onEarningComplete?: () => void;
}

const STORAGE_KEY_PREFIX = 'investment_timer_';
const HOUR_IN_MS = 60 * 60 * 1000;

interface StoredTimerData {
  lastKnownEarningDate: string;
  localDaysCompleted: number;
  localTotalEarned: number;
}

export const InvestmentTimer = ({ investment, onEarningComplete }: InvestmentTimerProps) => {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [localDaysCompleted, setLocalDaysCompleted] = useState(investment.days_completed);
  const [localTotalEarned, setLocalTotalEarned] = useState(investment.total_earned);
  const [isNearEnd, setIsNearEnd] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  const hourlyEarning = investment.daily_earning / 24;
  const daysRemaining = investment.total_days - localDaysCompleted;
  const planProgress = (localDaysCompleted / investment.total_days) * 100;

  // Get stored timer data from localStorage
  const getStoredData = useCallback((): StoredTimerData | null => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${investment.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading timer data from localStorage:', e);
    }
    return null;
  }, [investment.id]);

  // Save timer data to localStorage
  const saveStoredData = useCallback((data: StoredTimerData) => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${investment.id}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving timer data to localStorage:', e);
    }
  }, [investment.id]);

  // Calculate next earning time
  const calculateNextEarningTime = useCallback(() => {
    const storedData = getStoredData();
    
    // Use stored data if available, otherwise use server data
    const lastEarningDate = storedData?.lastKnownEarningDate 
      ? new Date(storedData.lastKnownEarningDate)
      : investment.last_earning_date 
        ? new Date(investment.last_earning_date)
        : new Date(investment.start_date);
    
    return new Date(lastEarningDate.getTime() + HOUR_IN_MS);
  }, [investment.last_earning_date, investment.start_date, getStoredData]);

  // Handle earning completion
  const handleEarningComplete = useCallback(() => {
    const now = new Date();
    
    // Calculate how many hours have passed since last earning
    const storedData = getStoredData();
    const lastEarning = storedData?.lastKnownEarningDate 
      ? new Date(storedData.lastKnownEarningDate)
      : investment.last_earning_date 
        ? new Date(investment.last_earning_date)
        : new Date(investment.start_date);
    
    const hoursPassed = Math.floor((now.getTime() - lastEarning.getTime()) / HOUR_IN_MS);
    
    if (hoursPassed >= 1) {
      // Calculate new values
      const earningsToAdd = hourlyEarning * hoursPassed;
      const hoursInDay = 24;
      const additionalDays = Math.floor(hoursPassed / hoursInDay);
      
      const newTotalEarned = localTotalEarned + earningsToAdd;
      const newDaysCompleted = Math.min(
        localDaysCompleted + additionalDays + (hoursPassed % hoursInDay >= 24 ? 1 : 0),
        investment.total_days
      );
      
      // Update local state
      setLocalTotalEarned(newTotalEarned);
      
      // Check if a full day has been completed
      const hoursCompletedToday = Math.floor((now.getTime() - new Date(investment.start_date).getTime()) / HOUR_IN_MS);
      const currentDay = Math.floor(hoursCompletedToday / 24) + 1;
      
      if (currentDay > localDaysCompleted && currentDay <= investment.total_days) {
        setLocalDaysCompleted(currentDay);
      }
      
      // Save to localStorage with updated last earning time
      const newLastEarning = new Date(lastEarning.getTime() + (hoursPassed * HOUR_IN_MS));
      saveStoredData({
        lastKnownEarningDate: newLastEarning.toISOString(),
        localDaysCompleted: newDaysCompleted,
        localTotalEarned: newTotalEarned
      });
      
      // Show notification
      toast({
        title: "💰 Earning Credited!",
        description: `KES ${earningsToAdd.toFixed(2)} earned from ${investment.plan_name}`,
      });
      
      // Trigger parent callback to refresh data
      onEarningComplete?.();
    }
  }, [
    investment, 
    localDaysCompleted, 
    localTotalEarned, 
    hourlyEarning, 
    getStoredData, 
    saveStoredData, 
    toast, 
    onEarningComplete
  ]);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedData = getStoredData();
    if (storedData) {
      // Use server data if it's more recent, otherwise use stored
      const serverEarningDate = investment.last_earning_date 
        ? new Date(investment.last_earning_date) 
        : new Date(investment.start_date);
      const storedEarningDate = new Date(storedData.lastKnownEarningDate);
      
      if (serverEarningDate > storedEarningDate) {
        // Server has newer data, use it
        setLocalDaysCompleted(investment.days_completed);
        setLocalTotalEarned(investment.total_earned);
        saveStoredData({
          lastKnownEarningDate: serverEarningDate.toISOString(),
          localDaysCompleted: investment.days_completed,
          localTotalEarned: investment.total_earned
        });
      } else {
        // Use stored data
        setLocalDaysCompleted(storedData.localDaysCompleted);
        setLocalTotalEarned(storedData.localTotalEarned);
      }
    } else {
      // No stored data, save current server data
      const lastEarning = investment.last_earning_date || investment.start_date;
      saveStoredData({
        lastKnownEarningDate: lastEarning,
        localDaysCompleted: investment.days_completed,
        localTotalEarned: investment.total_earned
      });
    }
  }, [investment, getStoredData, saveStoredData]);

  // Timer effect
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextEarning = calculateNextEarningTime();
      const remaining = nextEarning.getTime() - now.getTime();

      if (remaining <= 0) {
        // Time to earn!
        handleEarningComplete();
        return;
      }

      setTimeRemaining(remaining);
      
      // Calculate progress (how much of the hour has passed)
      const elapsed = HOUR_IN_MS - remaining;
      const progressPercent = Math.min(100, (elapsed / HOUR_IN_MS) * 100);
      setProgress(progressPercent);
      
      // Set warning states
      const fiveMinutes = 5 * 60 * 1000;
      const oneMinute = 60 * 1000;
      setIsNearEnd(remaining <= fiveMinutes);
      setIsCritical(remaining <= oneMinute);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [calculateNextEarningTime, handleEarningComplete]);

  // Format time remaining
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '00:00:00';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get timer color class
  const getTimerColorClass = () => {
    if (isCritical) return 'text-destructive animate-pulse';
    if (isNearEnd) return 'text-warning';
    return 'text-info';
  };

  const getTimerBorderClass = () => {
    if (isCritical) return 'border-destructive/40 bg-destructive/5';
    if (isNearEnd) return 'border-warning/40 bg-warning/5';
    return 'border-info/20 bg-info/5';
  };

  const getProgressColorClass = () => {
    if (isCritical) return '[&>div]:bg-destructive';
    if (isNearEnd) return '[&>div]:bg-warning';
    return '';
  };

  return (
    <Card className="border-0 shadow-soft bg-gradient-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{investment.plan_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              KES {investment.amount.toLocaleString()} invested
            </p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Earning Timer */}
        <div className={cn(
          "border rounded-lg p-4 transition-colors duration-300",
          getTimerBorderClass()
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className={cn("h-4 w-4", getTimerColorClass())} />
              <span className="text-sm font-medium">Next Earning In:</span>
            </div>
            <div className="flex items-center gap-2">
              {isNearEnd && (
                <Bell className={cn("h-4 w-4", isCritical ? "animate-bounce text-destructive" : "text-warning")} />
              )}
              <span className={cn(
                "text-xl font-bold font-mono transition-colors duration-300",
                getTimerColorClass()
              )}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          <Progress 
            value={progress} 
            className={cn("h-2 transition-colors duration-300", getProgressColorClass())} 
          />
          <p className="text-xs text-muted-foreground mt-2">
            Hourly earning: KES {hourlyEarning.toFixed(2)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-background/60 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Daily Earning</p>
            <p className="text-lg font-bold text-success flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />
              KES {investment.daily_earning}
            </p>
          </div>
          <div className="text-center p-3 bg-background/60 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
            <p className="text-lg font-bold text-primary">
              KES {localTotalEarned.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Plan Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Plan Progress</span>
            <span className="text-sm text-muted-foreground">
              Day {localDaysCompleted} of {investment.total_days}
            </span>
          </div>
          <Progress value={planProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {daysRemaining} days remaining
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
