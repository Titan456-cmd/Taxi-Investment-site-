import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History as HistoryIcon, Download, Filter, TrendingUp, Banknote, Car, Users, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransactions } from "@/contexts/TransactionContext";

const History = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();
  const { transactions } = useTransactions();

  // Filter and map live transactions
  const liveTransactions = transactions.map(t => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: t.type === "withdrawal" ? -t.amount : t.amount,
    status: t.status,
    date: t.requestedAt,
    reference: t.id.slice(0, 10).toUpperCase()
  }));

  // Mock old transaction history
  const oldTransactions = [
    {
      id: "1",
      type: "deposit",
      description: "MPESA Deposit",
      amount: 500,
      status: "completed",
      date: "2024-01-15 14:30",
      reference: "NEK4X5TR23"
    },
    {
      id: "2",
      type: "purchase",
      description: "Taxi A - British Classic",
      amount: -200,
      status: "completed",
      date: "2024-01-15 15:00",
      reference: "TAXI_A_001"
    },
    {
      id: "3",
      type: "earning",
      description: "Hourly Credit - Taxi A",
      amount: 2.08,
      status: "completed",
      date: "2024-01-15 16:00",
      reference: "HOUR_001"
    },
    {
      id: "4",
      type: "withdrawal",
      description: "MPESA Withdrawal",
      amount: -150,
      status: "pending",
      date: "2024-01-14 10:20",
      reference: "WITH_001"
    },
    {
      id: "5",
      type: "referral",
      description: "Level A Referral Commission",
      amount: 50,
      status: "completed",
      date: "2024-01-13 09:15",
      reference: "REF_A_001"
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "withdrawal":
        return <Banknote className="h-4 w-4 text-warning" />;
      case "purchase":
        return <Car className="h-4 w-4 text-primary" />;
      case "earning":
        return <TrendingUp className="h-4 w-4 text-info" />;
      case "referral":
        return <Users className="h-4 w-4 text-success" />;
      default:
        return <HistoryIcon className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/10 text-success border-success">Completed</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      deposit: "Deposit",
      withdrawal: "Withdrawal", 
      purchase: "Investment",
      earning: "Earnings",
      referral: "Referral"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Description", "Amount (KES)", "Status", "Reference"];
    const csvContent = [
      headers.join(","),
      ...allTransactions.map(t => [
        t.date,
        getTypeLabel(t.type),
        t.description,
        t.amount,
        t.status,
        t.reference
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transaction-history.csv";
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Transaction history exported to CSV",
    });
  };

  // Combine live and old transactions
  const allTransactions = [...liveTransactions, ...oldTransactions];

  const filteredTransactions = allTransactions.filter(transaction => {
    if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
    if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
    // Add date filtering logic here if needed
    return true;
  });

  // Calculate summary stats
  const totalDeposits = allTransactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalWithdrawals = Math.abs(allTransactions.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((sum, t) => sum + t.amount, 0));
  const totalEarnings = allTransactions.filter(t => t.type === "earning" && t.status === "completed").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReferrals = allTransactions.filter(t => t.type === "referral" && t.status === "completed").reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <HistoryIcon className="h-8 w-8" />
            Transaction History
          </h1>
          <p className="text-white/80">Complete record of all your financial activities</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {/* Filters */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Export
                </CardTitle>
                <CardDescription>Filter transactions and export data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals</SelectItem>
                        <SelectItem value="investment">Investments</SelectItem>
                        <SelectItem value="earning">Earnings</SelectItem>
                        <SelectItem value="referral">Referrals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button 
                      onClick={exportToCSV}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction List */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Showing {filteredTransactions.length} transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-card">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(transaction.type)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{transaction.description}</span>
                            {getStatusBadge(transaction.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.date} • {transaction.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${transaction.amount > 0 ? 'text-success' : 'text-warning'}`}>
                          {transaction.amount > 0 ? '+' : ''}KES {Math.abs(transaction.amount).toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getTypeLabel(transaction.type)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">KES {totalDeposits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time deposits</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                  <Banknote className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">KES {totalWithdrawals.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time withdrawals</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">KES {totalEarnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">From taxi investments</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referral Earnings</CardTitle>
                  <Users className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">KES {totalReferrals.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">From referral commissions</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Breakdown */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription>Summary of your platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Transaction Counts</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposits:</span>
                        <span className="font-medium">{transactions.filter(t => t.type === "deposit").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Withdrawals:</span>
                        <span className="font-medium">{transactions.filter(t => t.type === "withdrawal").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Investments:</span>
                        <span className="font-medium">{allTransactions.filter(t => t.type === "investment" || t.type === "purchase").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Earnings Credits:</span>
                        <span className="font-medium">{transactions.filter(t => t.type === "earning").length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Net Activity</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Deposits:</span>
                        <span className="font-medium text-success">+KES {(totalDeposits - totalWithdrawals).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Earned:</span>
                        <span className="font-medium text-info">+KES {(totalEarnings + totalReferrals).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Overall Performance:</span>
                        <span className="font-bold text-success">+KES {(totalDeposits - totalWithdrawals + totalEarnings + totalReferrals).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default History;
