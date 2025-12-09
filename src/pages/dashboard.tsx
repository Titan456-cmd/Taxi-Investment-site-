import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Car, Wallet, TrendingUp, Users, ArrowUpRight, Plus, Clock, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TaxiCard } from "@/components/TaxiCard";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { useInvestments } from "@/hooks/useInvestments";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { wallet, loading: walletLoading } = useWallet();
  const { investments, loading: investmentsLoading } = useInvestments();
  const { user } = useAuth();
  const [referralEarnings, setReferralEarnings] = useState({ levelA: 0, levelB: 0, levelC: 0 });

  const loading = walletLoading || investmentsLoading;
  
  // Calculate withdrawable balance
  const withdrawableBalance = (wallet?.deposit_balance || 0) + (wallet?.earnings_balance || 0);

  // Fetch referral earnings
  useEffect(() => {
    const fetchReferralEarnings = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, description')
        .eq('user_id', user.id)
        .eq('type', 'referral_bonus')
        .eq('status', 'completed');

      if (!error && data) {
        const earnings = { levelA: 0, levelB: 0, levelC: 0 };
        data.forEach(tx => {
          if (tx.description?.includes('Level A')) {
            earnings.levelA += tx.amount;
          } else if (tx.description?.includes('Level B')) {
            earnings.levelB += tx.amount;
          } else if (tx.description?.includes('Level C')) {
            earnings.levelC += tx.amount;
          }
        });
        setReferralEarnings(earnings);
      }
    };

    fetchReferralEarnings();
  }, [user]);

  // Calculate hourly earnings breakdown
  const hourlyBreakdown = investments.map((inv) => ({
    planName: inv.plan_name,
    dailyEarning: inv.daily_earning,
    hourlyEarning: inv.daily_earning / 24,
    daysRemaining: inv.total_days - inv.days_completed,
    progress: ((inv.days_completed / inv.total_days) * 100),
  }));

  const totalHourlyEarning = hourlyBreakdown.reduce((sum, inv) => sum + inv.hourlyEarning, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const taxis = [
    {
      id: "A",
      name: "British Classic Taxi",
      image: "/placeholder.svg",
      deposit: 200,
      dailyEarning: 50,
      duration: 30,
      available: true
    },
    {
      id: "B", 
      name: "American Modern Taxi",
      image: "/placeholder.svg",
      deposit: 500,
      dailyEarning: 100,
      duration: 30,
      available: true
    },
    {
      id: "C",
      name: "Electric Eco Taxi", 
      image: "/placeholder.svg",
      deposit: 700,
      dailyEarning: 120,
      duration: 30,
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.user_metadata?.full_name || 'Investor'}!</h1>
          <p className="text-white/80">Your taxi investment portfolio</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposit Wallet</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                KES {wallet?.deposit_balance?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings Wallet</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                KES {wallet?.earnings_balance?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                KES {(
                  (wallet?.deposit_balance || 0) + 
                  (wallet?.earnings_balance || 0)
                ).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Withdrawable</CardTitle>
              <Banknote className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                KES {withdrawableBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Deposit + Earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button 
            size="lg" 
            className="bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
            onClick={() => navigate("/deposit")}
          >
            <Plus className="mr-2 h-5 w-5" />
            Deposit Funds
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/withdraw")}
          >
            <ArrowUpRight className="mr-2 h-5 w-5" />
            Withdraw
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Taxis */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Quick Invest - Top Taxis
                </CardTitle>
                <CardDescription>
                  Start earning with these popular taxi plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {taxis.map((taxi) => (
                    <TaxiCard
                      key={taxi.id}
                      taxi={taxi}
                      onPurchase={() => {}}
                      userBalance={wallet?.deposit_balance || 0}
                    />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/invest")}
                  >
                    View All Taxis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Active Plans */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Active Plans</CardTitle>
                <CardDescription>Your current investments</CardDescription>
              </CardHeader>
              <CardContent>
                {investments.length > 0 ? (
                  <div className="space-y-4">
                    {investments.map((inv) => (
                      <div key={inv.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{inv.plan_name}</span>
                          <Badge variant="outline">{inv.total_days - inv.days_completed} days left</Badge>
                        </div>
                        <Progress value={(inv.days_completed / inv.total_days) * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Day {inv.days_completed} of {inv.total_days}</span>
                          <span className="text-success">Earned: KES {inv.total_earned.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No active plans yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Hourly Earnings Breakdown */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-success" />
                  Hourly Earnings
                </CardTitle>
                <CardDescription>Breakdown by active investment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Total Hourly */}
                  <div className="text-center pb-3 border-b">
                    <div className="text-3xl font-bold text-success">
                      KES {totalHourlyEarning.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total per hour</p>
                  </div>
                  
                  {/* Per Investment Breakdown */}
                  {hourlyBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {hourlyBreakdown.map((inv, index) => (
                        <div key={index} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{inv.planName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {inv.daysRemaining}d left
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                            <span>KES {inv.dailyEarning}/day</span>
                            <span className="text-success font-medium">
                              +KES {inv.hourlyEarning.toFixed(2)}/hr
                            </span>
                          </div>
                          <Progress value={inv.progress} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center text-sm py-2">
                      No active investments
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Referral Snapshot */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Referral Earnings</CardTitle>
                <CardDescription>Commission from your referrals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Level A (10%)</span>
                    <span className="font-medium text-success">KES {referralEarnings.levelA.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level B (5%)</span>
                    <span className="font-medium text-success">KES {referralEarnings.levelB.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level C (3%)</span>
                    <span className="font-medium text-success">KES {referralEarnings.levelC.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-success">KES {(referralEarnings.levelA + referralEarnings.levelB + referralEarnings.levelC).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate("/referrals")}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
