import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, phoneNumber: string, referralCode?: string) => Promise<{ error: any; userId?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // If referral code provided, look up the referrer's user ID
    let referredBy: string | null = null;
    if (referralCode) {
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();
      
      if (referrerProfile) {
        referredBy = referrerProfile.id;
      }
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          referred_by: referredBy,
        },
      },
    });

    // If signup successful and there was a referrer, update the profile and send notification
    if (!error && data.user && referredBy) {
      // Update the profile with referred_by (the trigger creates the profile, so we update it)
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({ referred_by: referredBy })
          .eq('id', data.user!.id);

        // Send referral notification to the referrer
        try {
          await supabase.functions.invoke('send-referral-notification', {
            body: {
              referrerId: referredBy,
              newUserId: data.user!.id,
              newUserName: fullName,
              newUserEmail: email,
            },
          });
          console.log('Referral notification sent');
        } catch (notifError) {
          console.error('Failed to send referral notification:', notifError);
        }
      }, 2000); // Wait for trigger to create profile first
    }

    return { error, userId: data?.user?.id };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
