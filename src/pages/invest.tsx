import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaxiCard } from "@/components/TaxiCard";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInvestments } from "@/hooks/useInvestments";
import { InvestmentTimer } from "@/components/InvestmentTimer";
import { useState, useCallback } from "react";

const Invest = () => {
  const { toast } = useToast();
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { user } = useAuth();
  const { investments, loading: investmentsLoading, refetch: refetchInvestments } = useInvestments();
  const [purchasing, setPurchasing] = useState(false);
  
  // Callback when an earning is completed
  const handleEarningComplete = useCallback(() => {
    // Refresh both wallet and investments data from server
    refetchWallet?.();
    refetchInvestments?.();
  }, [refetchWallet, refetchInvestments]);

  const availableTaxis = [
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
    },
    {
      id: "D",
      name: "Bugatti-Style Luxury Taxi",
      image: "/placeholder.svg",
      deposit: 1000,
      dailyEarning: 200,
      duration: 30,
      available: true
    },
    {
      id: "E",
      name: "Premium Sports Taxi",
      image: "/placeholder.svg",
      deposit: 2000,
      dailyEarning: 300,
      duration: 30,
      available: true
    },
    {
      id: "F",
      name: "Ultimate Supercar Taxi",
      image: "/placeholder.svg",
      deposit: 5000,
      dailyEarning: 500,
      duration: 30,
      available: true
    }
  ];

  const comingSoonTaxis = [
    { id: "G", name: "Hydrogen Future Taxi" },
    { id: "H", name: "Flying Taxi Concept" },
    { id: "I", name: "Autonomous Luxury Pod" },
    { id: "J", name: "Space Age Transport" }
  ];

  const handleInvest = async (taxi: typeof availableTaxis[0]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make an investment.",
        variant: "destructive",
      });
      return;
    }

    const depositBalance = wallet?.deposit_balance || 0;
    
    if (depositBalance < taxi.deposit) {
      toast({
        title: "Insufficient Balance",
        description: `You need KES ${(taxi.deposit - depositBalance).toLocaleString()} more in your deposit wallet.`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    try {
      // Step 1: Deduct from deposit balance and add to investment balance
      const { error: deductError } = await supabase.rpc('decrement_wallet_balance', {
        p_user_id: user.id,
        p_amount: taxi.deposit,
        p_balance_type: 'deposit_balance'
      });

      if (deductError) throw deductError;

      const { error: incrementError } = await supabase.rpc('increment_wallet_balance', {
        p_user_id: user.id,
        p_amount: taxi.deposit,
        p_balance_type: 'investment_balance'
      });

      if (incrementError) {
        // Rollback deposit deduction
        await supabase.rpc('increment_wallet_balance', {
          p_user_id: user.id,
          p_amount: taxi.deposit,
          p_balance_type: 'deposit_balance'
        });
        throw incrementError;
      }

      // Step 2: Create investment record
      const startDate = new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + taxi.duration);

      const { error: investmentError } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          plan_name: taxi.name,
          amount: taxi.deposit,
          daily_earning: taxi.dailyEarning,
          total_days: taxi.duration,
          days_completed: 0,
          total_earned: 0,
          start_date: startDate.toISOString(),
          maturity_date: maturityDate.toISOString(),
          status: 'active'
        });

      if (investmentError) {
        // Rollback wallet changes
        await supabase.rpc('decrement_wallet_balance', {
          p_user_id: user.id,
          p_amount: taxi.deposit,
          p_balance_type: 'investment_balance'
        });
        await supabase.rpc('increment_wallet_balance', {
          p_user_id: user.id,
          p_amount: taxi.deposit,
          p_balance_type: 'deposit_balance'
        });
        throw investmentError;
      }

      // Step 3: Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'investment',
          amount: taxi.deposit,
          status: 'completed',
          description: `Investment in ${taxi.name} (Taxi ${taxi.id})`,
          processed_at: new Date().toISOString()
        });

      toast({
        title: "Investment Successful!",
        description: `You've invested in ${taxi.name}. Earnings will be credited hourly.`,
      });

    } catch (error: any) {
      console.error('Investment error:', error);
      toast({
        title: "Investment Failed",
        description: error.message || "Failed to process investment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (walletLoading || investmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Car className="h-8 w-8" />
            Taxi Investment Options
          </h1>
          <p className="text-white/80">Choose your investment plan and start earning daily returns</p>
          
          {/* Balance Display */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Deposit Wallet</p>
              <p className="text-xl font-bold">KES {wallet?.deposit_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Earnings Wallet</p>
              <p className="text-xl font-bold text-green-300">KES {wallet?.earnings_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Invested</p>
              <p className="text-xl font-bold">KES {wallet?.investment_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <p className="text-xs text-white/70">Total Balance</p>
              <p className="text-xl font-bold">KES {((wallet?.deposit_balance || 0) + (wallet?.earnings_balance || 0)).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Active Investments with Timers */}
        {investments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-bold">Your Active Investments</h2>
              <Badge variant="outline" className="bg-success/10 text-success border-success">
                <TrendingUp className="h-3 w-3 mr-1" />
                {investments.length} Active
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investments.map((investment) => (
                <InvestmentTimer 
                  key={investment.id} 
                  investment={investment} 
                  onEarningComplete={handleEarningComplete}
                />
              ))}
            </div>
          </section>
        )}
        {/* Available Taxis */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold">Available Investment Plans</h2>
            <Badge variant="outline" className="bg-success/10 text-success border-success">
              Ready to Invest
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTaxis.map((taxi) => (
              <TaxiCard
                key={taxi.id}
                taxi={taxi}
                onPurchase={() => handleInvest(taxi)}
                userBalance={wallet?.deposit_balance || 0}
                disabled={purchasing}
              />
            ))}
          </div>
        </section>

        {/* Coming Soon */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold">Coming Soon</h2>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
              <Clock className="h-3 w-3 mr-1" />
              Launching Soon
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {comingSoonTaxis.map((taxi) => (
              <Card key={taxi.id} className="relative overflow-hidden border-0 shadow-soft">
                <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/40 z-10" />
                <Badge className="absolute top-4 right-4 z-20 bg-warning text-warning-foreground">
                  Coming Soon
                </Badge>
                
                <CardHeader className="relative z-20">
                  <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <CardTitle className="text-lg">{taxi.name}</CardTitle>
                  <CardDescription>
                    Exciting new investment opportunity
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-20">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Details to be announced</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Investment Info */}
        <Card className="border-0 shadow-soft bg-gradient-card">
          <CardHeader>
            <CardTitle>Investment Information</CardTitle>
            <CardDescription>Important details about taxi investments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-background/60">
                <h4 className="font-semibold text-primary mb-2">Fixed Terms</h4>
                <p className="text-muted-foreground">All plans run for exactly 30 days with fixed daily returns</p>
              </div>
              <div className="p-4 rounded-lg bg-background/60">
                <h4 className="font-semibold text-success mb-2">Hourly Credits</h4>
                <p className="text-muted-foreground">Earnings are credited to your wallet every hour automatically</p>
              </div>
              <div className="p-4 rounded-lg bg-background/60">
                <h4 className="font-semibold text-info mb-2">No Compounding</h4>
                <p className="text-muted-foreground">Plans do not auto-renew. Manual reinvestment required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Invest;
