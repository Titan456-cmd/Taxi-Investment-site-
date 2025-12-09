import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, AlertTriangle, Wallet, TrendingUp, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransactions } from "@/contexts/TransactionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { z } from "zod";

// Validation schema
const withdrawalSchema = z.object({
  amount: z.number().min(100, "Minimum withdrawal amount is KES 100").positive(),
  phoneNumber: z.string()
    .trim()
    .regex(/^(\+?254|0)[17]\d{8}$/, "Invalid Kenyan phone number format")
    .max(15, "Phone number too long"),
});

const Withdraw = () => {
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const { user } = useAuth();
  const { wallet, loading } = useWallet();

  const minimumWithdrawal = 100;
  const withdrawableBalance = (wallet?.deposit_balance || 0) + (wallet?.earnings_balance || 0);

  // Fee calculation: 2% with minimum 10 KES and maximum 50 KES
  const feeCalculation = useMemo(() => {
    const requestAmount = parseFloat(amount) || 0;
    if (requestAmount < minimumWithdrawal) {
      return { fee: 0, netAmount: 0, requestAmount: 0 };
    }
    
    const percentageFee = requestAmount * 0.02; // 2%
    const fee = Math.max(10, Math.min(50, percentageFee)); // Min 10 KES, Max 50 KES
    const netAmount = requestAmount - fee;
    
    return { fee, netAmount, requestAmount };
  }, [amount, minimumWithdrawal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSubmitWithdrawal = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request a withdrawal",
        variant: "destructive"
      });
      return;
    }

    // Validate inputs
    const validation = withdrawalSchema.safeParse({
      amount: parseFloat(amount),
      phoneNumber: phoneNumber.trim(),
    });

    if (!validation.success) {
      toast({
        title: "Invalid Input",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const withdrawAmount = validation.data.amount;
    const validPhone = validation.data.phoneNumber;

    if (withdrawAmount > withdrawableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough withdrawable funds",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Decrement from earnings first, then deposit if needed
      let remainingAmount = withdrawAmount;
      const earningsBalance = wallet?.earnings_balance || 0;
      const depositBalance = wallet?.deposit_balance || 0;

      if (earningsBalance > 0) {
        const fromEarnings = Math.min(remainingAmount, earningsBalance);
        const { error: earningsError } = await supabase.rpc('decrement_wallet_balance', {
          p_user_id: user.id,
          p_amount: fromEarnings,
          p_balance_type: 'earnings_balance'
        });
        if (earningsError) throw earningsError;
        remainingAmount -= fromEarnings;
      }

      if (remainingAmount > 0 && depositBalance > 0) {
        const fromDeposit = Math.min(remainingAmount, depositBalance);
        const { error: depositError } = await supabase.rpc('decrement_wallet_balance', {
          p_user_id: user.id,
          p_amount: fromDeposit,
          p_balance_type: 'deposit_balance'
        });
        if (depositError) {
          // Rollback earnings if deposit fails
          if (withdrawAmount > remainingAmount) {
            await supabase.rpc('increment_wallet_balance', {
              p_user_id: user.id,
              p_amount: withdrawAmount - remainingAmount,
              p_balance_type: 'earnings_balance'
            });
          }
          throw depositError;
        }
      }

      // Step 2: Create withdrawal transaction record
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: withdrawAmount,
          status: 'pending',
          description: `Withdrawal to M-Pesa ${validPhone}`,
          phone_number: validPhone,
        })
        .select()
        .single();

      if (txError) {
        // Rollback: Increment balances back if transaction creation fails
        const earningsUsed = Math.min(withdrawAmount, wallet?.earnings_balance || 0);
        const depositUsed = withdrawAmount - earningsUsed;
        
        if (earningsUsed > 0) {
          await supabase.rpc('increment_wallet_balance', {
            p_user_id: user.id,
            p_amount: earningsUsed,
            p_balance_type: 'earnings_balance'
          });
        }
        if (depositUsed > 0) {
          await supabase.rpc('increment_wallet_balance', {
            p_user_id: user.id,
            p_amount: depositUsed,
            p_balance_type: 'deposit_balance'
          });
        }
        throw txError;
      }

      // Step 3: Send email notification in background (don't block on this)
      supabase.functions.invoke('send-withdrawal-notification', {
        body: {
          userId: user.id,
          amount: withdrawAmount,
          phoneNumber: validPhone,
          transactionId: txData.id,
        },
      }).catch((emailError) => {
        // Log error but don't fail the withdrawal
        console.error('Failed to send email notification:', emailError);
      });

      // Update local context
      addTransaction({
        type: "withdrawal",
        amount: withdrawAmount,
        status: "pending",
        description: `Withdrawal to M-Pesa ${validPhone}`,
        phoneNumber: validPhone,
        processedAt: null,
      });

      toast({
        title: "Withdrawal Requested",
        description: `KES ${withdrawAmount.toLocaleString()} has been deducted and is pending approval`,
      });

      setAmount("");
      setPhoneNumber("");
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            Withdraw Funds
          </h1>
          <p className="text-white/80">Request withdrawal from your earnings wallet</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="withdraw" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="withdraw">Request Withdrawal</TabsTrigger>
            <TabsTrigger value="history">Withdrawal History</TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="space-y-6">
            {/* Balance Overview - Match Dashboard Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <CardTitle className="text-sm font-medium">Total Withdrawable</CardTitle>
                  <Banknote className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">
                    KES {withdrawableBalance.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for withdrawal
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal Form */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Withdrawal Request</CardTitle>
                <CardDescription>
                  Submit a withdrawal request to receive your earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (KES)</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder={`Minimum ${minimumWithdrawal}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum withdrawal: KES {minimumWithdrawal}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">MPESA Phone Number</Label>
                    <Input
                      id="phone-number"
                      placeholder="254712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your MPESA registered number
                    </p>
                  </div>
                </div>

                {/* Fee Calculator */}
                {amount && parseFloat(amount) >= minimumWithdrawal && (
                  <Card className="bg-info/5 border-info/20 border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-info" />
                        Withdrawal Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Requested Amount:</span>
                        <span className="font-semibold text-lg">KES {feeCalculation.requestAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-warning">
                        <span className="text-sm">Processing Fee (2%):</span>
                        <span className="font-semibold">- KES {feeCalculation.fee.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-border my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Net Amount to Receive:</span>
                        <span className="font-bold text-xl text-success">KES {feeCalculation.netAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Fee range: KES 10 (min) - KES 50 (max)
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-warning">Important Notes:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Processing fee: 2% (Min: KES 10, Max: KES 50)</li>
                        <li>• Withdrawals require admin approval</li>
                        <li>• Processing time: 1-24 hours during business days</li>
                        <li>• Minimum withdrawal amount: KES {minimumWithdrawal}</li>
                        <li>• Funds withdrawn from deposit + earnings wallets</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitWithdrawal}
                  className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                  size="lg"
                  disabled={!amount || parseFloat(amount) < minimumWithdrawal || isProcessing}
                >
                  {isProcessing ? "Processing..." : "Request Withdrawal"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>View your recent withdrawal requests in the History tab</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Check the History page to see all your transactions</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Withdraw;
