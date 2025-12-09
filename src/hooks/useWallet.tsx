import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Wallet {
  deposit_balance: number;
  withdrawal_balance: number;
  earnings_balance: number;
  investment_balance: number;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet:', error);
    } else {
      setWallet(data);
    }
    setLoading(false);
  }, [user]);

  const refetch = useCallback(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    fetchWallet();

    if (!user) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Wallet updated:', payload);
          setWallet(payload.new as Wallet);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWallet]);

  return { wallet, loading, refetch };
};
