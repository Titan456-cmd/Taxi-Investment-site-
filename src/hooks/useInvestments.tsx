import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Investment {
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
}

export const useInvestments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investments:', error);
    } else {
      setInvestments(data || []);
    }
    setLoading(false);
  }, [user]);

  const refetch = useCallback(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  useEffect(() => {
    fetchInvestments();

    if (!user) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('investment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Investment updated:', payload);
          fetchInvestments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInvestments]);

  return { investments, loading, refetch };
};
