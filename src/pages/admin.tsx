import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, DollarSign, ArrowUpCircle, ArrowDownCircle, Play, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  phone_number: string | null;
  mpesa_receipt_number: string | null;
  reference_number: string | null;
  description: string | null;
  profiles: {
    full_name: string | null;
    phone_number: string | null;
  };
}

interface Investment {
  id: string;
  user_id: string;
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
  created_at: string;
  profiles: {
    full_name: string | null;
    phone_number: string | null;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingEarnings, setProcessingEarnings] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchTransactions();
      fetchInvestments();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles!inner(
          full_name,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions',
        variant: 'destructive',
      });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const fetchInvestments = async () => {
    const { data, error } = await supabase
      .from('investments')
      .select(`
        *,
        profiles!inner(
          full_name,
          phone_number
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch investments',
        variant: 'destructive',
      });
    } else {
      setInvestments(data || []);
    }
  };

  const handleProcessEarnings = async () => {
    setProcessingEarnings(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-investment-earnings');
      
      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: data.message || 'Earnings processed successfully',
      });

      // Refresh investments after processing
      fetchInvestments();
    } catch (error) {
      console.error('Error processing earnings:', error);
      toast({
        title: 'Error',
        description: 'Failed to process earnings',
        variant: 'destructive',
      });
    } finally {
      setProcessingEarnings(false);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to approve transaction',
        variant: 'destructive',
      });
      return;
    }

    // Update wallet balance based on transaction type
    if (transaction.type === 'withdrawal') {
      const { error: walletError } = await supabase.rpc('decrement_wallet_balance', {
        p_user_id: transaction.user_id,
        p_amount: transaction.amount,
        p_balance_type: 'earnings_balance'
      });

      if (walletError) {
        console.error('Error updating wallet:', walletError);
      }
    }

    toast({
      title: 'Success',
      description: 'Transaction approved successfully',
    });

    fetchTransactions();
  };

  const handleReject = async (transactionId: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ 
        status: 'rejected',
        processed_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject transaction',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Transaction rejected successfully',
    });

    fetchTransactions();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      completed: 'default',
      failed: 'destructive',
      rejected: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const totalActiveInvestments = investments.reduce((sum, inv) => sum + inv.amount, 0);

  if (adminLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage transactions and user requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeposits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWithdrawals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              KES {totalActiveInvestments.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deposits">Pending Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Pending Withdrawals</TabsTrigger>
          <TabsTrigger value="investments">Active Investments</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Deposits</CardTitle>
              <CardDescription>Review and approve deposit requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDeposits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending deposits
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingDeposits.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.profiles.full_name || 'N/A'}</TableCell>
                        <TableCell>{transaction.phone_number || transaction.profiles.phone_number || 'N/A'}</TableCell>
                        <TableCell>KES {transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(transaction)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(transaction.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawals</CardTitle>
              <CardDescription>Review and approve withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending withdrawals
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingWithdrawals.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.profiles.full_name || 'N/A'}</TableCell>
                        <TableCell>{transaction.phone_number || transaction.profiles.phone_number || 'N/A'}</TableCell>
                        <TableCell>KES {transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(transaction)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(transaction.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Investments</CardTitle>
                  <CardDescription>View all active investments and process earnings</CardDescription>
                </div>
                <Button 
                  onClick={handleProcessEarnings}
                  disabled={processingEarnings}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {processingEarnings ? 'Processing...' : 'Process Earnings Now'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Daily Earning</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Last Earning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No active investments
                      </TableCell>
                    </TableRow>
                  ) : (
                    investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell>{investment.profiles.full_name || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{investment.plan_name}</TableCell>
                        <TableCell>KES {investment.amount.toLocaleString()}</TableCell>
                        <TableCell>KES {investment.daily_earning.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {investment.days_completed} / {investment.total_days} days
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.round((investment.days_completed / investment.total_days) * 100)}% complete
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          KES {investment.total_earned.toLocaleString()}
                        </TableCell>
                        <TableCell>{new Date(investment.start_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {investment.last_earning_date 
                            ? new Date(investment.last_earning_date).toLocaleString()
                            : 'Not yet'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Complete transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.profiles.full_name || 'N/A'}</TableCell>
                      <TableCell>KES {transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.mpesa_receipt_number || transaction.reference_number || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
