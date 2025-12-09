import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Copy, Clock, CheckCircle, XCircle, CreditCard, QrCode, Wallet, TrendingUp, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { z } from "zod";

// Validation schema for STK Push
const stkPushSchema = z.object({
  phoneNumber: z.string()
    .trim()
    .regex(/^(?:254|\+254|0)?([17]\d{8})$/, "Please enter a valid Kenyan phone number (e.g., 0712345678)"),
  amount: z.number()
    .min(10, "Minimum deposit amount is KES 10")
    .max(150000, "Maximum deposit amount is KES 150,000"),
});

// Validation schema for manual deposit
const manualDepositSchema = z.object({
  mpesaCode: z.string()
    .trim()
    .min(1, "M-Pesa transaction code is required")
    .regex(/^[A-Z0-9]{10}$/, "M-Pesa code must be exactly 10 alphanumeric characters (e.g., NEK4X5TR23)"),
  amount: z.number()
    .min(10, "Minimum deposit amount is KES 10")
    .max(150000, "Maximum deposit amount is KES 150,000"),
});

const Deposit = () => {
  const [mpesaCode, setMpesaCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState<"manual" | "stk">("stk");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { wallet } = useWallet();
  
  // Calculate withdrawable balance
  const withdrawableBalance = (wallet?.deposit_balance || 0) + (wallet?.earnings_balance || 0);

  const handleStkPush = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a deposit",
        variant: "destructive"
      });
      return;
    }

    // Validate inputs with zod
    const validation = stkPushSchema.safeParse({
      phoneNumber: phoneNumber.trim(),
      amount: parseFloat(amount) || 0,
    });

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber,
          amount: parseFloat(amount),
        },
      });

      if (error) throw error;

      if (data.success) {
        // Save pending transaction to database
        const { data: txData, error: dbError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'deposit',
            amount: parseFloat(amount),
            status: 'pending',
            description: `M-Pesa STK Push - ${phoneNumber}`,
            phone_number: phoneNumber,
            checkout_request_id: data.CheckoutRequestID,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error saving transaction:', dbError);
        } else {
          // Send email notification in background
          supabase.functions.invoke('send-deposit-notification', {
            body: {
              userId: user.id,
              amount: parseFloat(amount),
              phoneNumber,
              transactionId: txData.id,
              depositMethod: 'stk_push',
            },
          }).catch((emailError) => {
            console.error('Failed to send deposit notification:', emailError);
          });
        }

        toast({
          title: "Payment Request Sent",
          description: data.message || "Check your phone to complete the payment",
        });

        setPhoneNumber("");
        setAmount("");
      }
    } catch (error: any) {
      console.error('STK Push error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate M-Pesa payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a deposit",
        variant: "destructive"
      });
      return;
    }

    // Validate inputs with zod
    const validation = manualDepositSchema.safeParse({
      mpesaCode: mpesaCode.trim().toUpperCase(),
      amount: parseFloat(amount) || 0,
    });

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    try {
      // Save pending transaction to database
      const { data: txData, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: parseFloat(amount),
          status: 'pending',
          description: `Manual MPESA deposit - Code: ${mpesaCode}`,
          reference_number: mpesaCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification in background
      supabase.functions.invoke('send-deposit-notification', {
        body: {
          userId: user.id,
          amount: parseFloat(amount),
          phoneNumber: user.email || 'N/A',
          transactionId: txData.id,
          depositMethod: 'manual',
          mpesaCode: mpesaCode,
        },
      }).catch((emailError) => {
        console.error('Failed to send deposit notification:', emailError);
      });

      toast({
        title: "Deposit Submitted",
        description: "Your deposit is being processed. Check History tab for status.",
      });

      setMpesaCode("");
      setAmount("");
    } catch (error: any) {
      console.error('Error submitting deposit:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit deposit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  // Mock deposit history
  const depositHistory = [
    {
      id: "1",
      amount: 500,
      mpesaCode: "NEK4X5TR23",
      status: "completed",
      submittedAt: "2024-01-15 14:30",
      completedAt: "2024-01-15 14:35"
    },
    {
      id: "2", 
      amount: 200,
      mpesaCode: "NFK2Y7WE45",
      status: "pending",
      submittedAt: "2024-01-14 09:15",
      completedAt: null
    },
    {
      id: "3",
      amount: 1000,
      mpesaCode: "NGL8Z3QR67",
      status: "rejected",
      submittedAt: "2024-01-13 16:45",
      completedAt: "2024-01-13 16:50"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/10 text-success border-success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Deposit Funds
          </h1>
          <p className="text-white/80">Add money to your deposit wallet via MPESA</p>
          
          {/* Wallet Balance Display */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Deposit Wallet</p>
              <p className="text-xl font-bold">KES {wallet?.deposit_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Earnings Wallet</p>
              <p className="text-xl font-bold text-green-300">KES {wallet?.earnings_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <p className="text-xs text-white/70">Total Withdrawable</p>
              <p className="text-xl font-bold">KES {withdrawableBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="deposit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">Make Deposit</TabsTrigger>
            <TabsTrigger value="history">Deposit History</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-6">
            {/* Deposit Method Selection */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Choose Deposit Method</CardTitle>
                <CardDescription>Select how you want to deposit funds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setDepositMethod("stk")}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      depositMethod === "stk"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Smartphone className="h-8 w-8 mb-3 text-primary" />
                    <h3 className="font-semibold mb-2">STK Push (Instant)</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your M-Pesa PIN directly on your phone
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setDepositMethod("manual")}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      depositMethod === "manual"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Copy className="h-8 w-8 mb-3 text-primary" />
                    <h3 className="font-semibold mb-2">Manual Paybill</h3>
                    <p className="text-sm text-muted-foreground">
                      Use paybill and enter transaction code
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* STK Push Method */}
            {depositMethod === "stk" && (
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-success" />
                    M-Pesa STK Push
                  </CardTitle>
                  <CardDescription>
                    Receive payment prompt directly on your phone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                    <h4 className="font-semibold text-info mb-2">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Enter your M-Pesa registered phone number and amount</li>
                      <li>Click "Send Payment Request"</li>
                      <li>Check your phone for M-Pesa payment prompt</li>
                      <li>Enter your M-Pesa PIN to complete payment</li>
                      <li>Funds will be added to your wallet automatically</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">M-Pesa Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="e.g., 0712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: 0712345678 or +254712345678
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stk-amount">Amount (KES)</Label>
                      <Input
                        id="stk-amount"
                        type="number"
                        placeholder="e.g., 500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleStkPush}
                    className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Send Payment Request"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Manual Paybill Method */}
            {depositMethod === "manual" && (
              <>
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-success" />
                      MPESA Paybill Instructions
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to deposit money into your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-card">
                        <Label className="text-sm font-medium text-muted-foreground">Paybill Number</Label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-bold text-primary">714888</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard("714888", "Paybill number")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-card">
                        <Label className="text-sm font-medium text-muted-foreground">Account Number</Label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-bold text-primary">312139</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard("312139", "Account number")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                      <h4 className="font-semibold text-info mb-2">How to Send Money:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Go to M-PESA on your phone</li>
                        <li>Select "Lipa na M-PESA"</li>
                        <li>Select "Pay Bill"</li>
                        <li>Enter Paybill Number: <strong>714888</strong></li>
                        <li>Enter Account Number: <strong>312139</strong></li>
                        <li>Enter the amount you want to deposit</li>
                        <li>Enter your M-PESA PIN and send</li>
                        <li>Copy the confirmation code and submit it below</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle>Submit Your Deposit</CardTitle>
                    <CardDescription>
                      Enter your MPESA transaction details after making the payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mpesa-code">MPESA Transaction Code</Label>
                        <Input
                          id="mpesa-code"
                          placeholder="e.g., NEK4X5TR23"
                          value={mpesaCode}
                          onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (KES)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="e.g., 500"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Your deposit will be reflected in your wallet within 5 minutes after submission and verification.
                      </p>
                    </div>

                    <Button 
                      onClick={handleSubmitDeposit}
                      className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                      size="lg"
                    >
                      Submit Deposit
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Deposit History</CardTitle>
                <CardDescription>Track all your deposit transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {depositHistory.map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-card">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">KES {deposit.amount.toLocaleString()}</span>
                          {getStatusBadge(deposit.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Code: {deposit.mpesaCode} • Submitted: {deposit.submittedAt}
                        </p>
                        {deposit.completedAt && (
                          <p className="text-sm text-muted-foreground">
                            Completed: {deposit.completedAt}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Deposit;
