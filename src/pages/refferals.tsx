import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Share2, TrendingUp, Gift, Link as LinkIcon, Download, QrCode, Trophy, Crown, Medal, Award, BarChart3, Wallet, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import QRCode from "react-qr-code";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  referral_count: number;
  total_earnings: number;
  rank: number;
}

interface ReferredUser {
  id: string;
  full_name: string | null;
  created_at: string;
  level: "A" | "B" | "C";
}

interface Wallet {
  deposit_balance?: number;
  earnings_balance?: number;
}

interface Profile {
  id: string;
  referral_code: string;
  full_name: string;
}

interface Transaction {
  amount: number;
  description?: string;
  type: string;
  status: string;
  user_id: string;
}

const Referrals = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [referralEarnings, setReferralEarnings] = useState({ levelA: 0, levelB: 0, levelC: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // Calculate withdrawable balance
  const withdrawableBalance = (wallet?.deposit_balance || 0) + (wallet?.earnings_balance || 0);
  
  // Calculate paginated data
  const paginatedReferrals = referredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch referral data function with improved efficiency
  const fetchReferralData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    try {
      // Fetch user's profile with referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (profile && isMounted) setReferralCode(profile.referral_code);

      // Fetch Level A: Users directly referred by current user
      const { data: levelAUsers, error: levelAError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .eq('referred_by', user.id);

      if (levelAError) throw levelAError;
      
      const levelAFormatted: ReferredUser[] = (levelAUsers || []).map(r => ({
        ...r,
        level: "A" as const
      }));

      // Fetch Level B: Users referred by Level A users
      const levelAIds = levelAFormatted.map(u => u.id);
      let levelBFormatted: ReferredUser[] = [];
      
      if (levelAIds.length > 0) {
        const { data: levelBUsers, error: levelBError } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .in('referred_by', levelAIds);
        
        if (!levelBError && levelBUsers) {
          levelBFormatted = levelBUsers.map(r => ({
            ...r,
            level: "B" as const
          }));
        }
      }

      // Fetch Level C: Users referred by Level B users
      const levelBIds = levelBFormatted.map(u => u.id);
      let levelCFormatted: ReferredUser[] = [];
      
      if (levelBIds.length > 0) {
        const { data: levelCUsers, error: levelCError } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .in('referred_by', levelBIds);
        
        if (!levelCError && levelCUsers) {
          levelCFormatted = levelCUsers.map(r => ({
            ...r,
            level: "C" as const
          }));
        }
      }

      // Combine all referrals
      if (isMounted) {
        setReferredUsers([...levelAFormatted, ...levelBFormatted, ...levelCFormatted]);
      }

      // Fetch referral bonus transactions to get actual earnings
      const { data: bonusTransactions, error: bonusError } = await supabase
        .from('transactions')
        .select('amount, description')
        .eq('user_id', user.id)
        .eq('type', 'referral_bonus')
        .eq('status', 'completed');

      if (!bonusError && bonusTransactions) {
        const earnings = { levelA: 0, levelB: 0, levelC: 0 };
        bonusTransactions.forEach(tx => {
          if (tx.description?.includes('Level A')) {
            earnings.levelA += tx.amount;
          } else if (tx.description?.includes('Level B')) {
            earnings.levelB += tx.amount;
          } else if (tx.description?.includes('Level C')) {
            earnings.levelC += tx.amount;
          }
        });
        if (isMounted) {
          setReferralEarnings(earnings);
        }
      }

      // Fetch leaderboard - top referrers with improved efficiency
      const { data: allProfiles, error: leaderboardError } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code');

      if (leaderboardError) throw leaderboardError;

      // Get referral counts efficiently with a single query
      const { data: referralCountsData, error: referralCountsError } = await supabase
        .from('profiles')
        .select('referred_by, id')
        .not('referred_by', 'is', null);

      if (!referralCountsError && referralCountsData) {
        const referralCounts: Record<string, number> = {};
        referralCountsData.forEach(profile => {
          if (profile.referred_by) {
            referralCounts[profile.referred_by] = (referralCounts[profile.referred_by] || 0) + 1;
          }
        });

        // Create leaderboard
        const leaderboardData: LeaderboardEntry[] = (allProfiles || [])
          .map(p => ({
            id: p.id,
            full_name: p.full_name || 'Anonymous',
            referral_count: referralCounts[p.id] || 0,
            total_earnings: (referralCounts[p.id] || 0) * 150, // Adjust multiplier as needed
            rank: 0
          }))
          .filter(e => e.referral_count > 0)
          .sort((a, b) => b.referral_count - a.referral_count)
          .slice(0, 10)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        if (isMounted) {
          setLeaderboard(leaderboardData);

          // Find user's rank
          const userEntry = leaderboardData.find(e => e.id === user.id);
          setUserRank(userEntry?.rank || null);
        }
      }

    } catch (error) {
      console.error('Error fetching referral data:', error);
      if (isMounted) {
        toast({
          title: "Error",
          description: "Failed to load referral data",
          variant: "destructive"
        });
      }
    }
    
    if (isMounted) {
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Real-time subscription for referral bonus transactions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral-bonuses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Check if it's a referral bonus transaction
          if (payload.new && payload.new.type === 'referral_bonus') {
            console.log('New referral bonus received:', payload.new);
            
            // Show toast notification
            toast({
              title: "Commission Earned!",
              description: `You earned KES ${payload.new.amount?.toLocaleString()} from a referral deposit!`,
            });
            
            // Refresh referral data to update earnings
            fetchReferralData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, fetchReferralData]);

  // Generate referral link using the custom domain
  useEffect(() => {
    if (referralCode) {
      setReferralLink(`https://titanme.me/auth?ref=${referralCode}`);
    }
  }, [referralCode]);

  // Calculate referral stats from actual data
  const referralStats = {
    levelA: { count: referredUsers.filter(r => r.level === "A").length, earnings: referralEarnings.levelA },
    levelB: { count: referredUsers.filter(r => r.level === "B").length, earnings: referralEarnings.levelB },
    levelC: { count: referredUsers.filter(r => r.level === "C").length, earnings: referralEarnings.levelC }
  };

  const totalReferrals = referralStats.levelA.count + referralStats.levelB.count + referralStats.levelC.count;
  const totalEarningsAmount = referralStats.levelA.earnings + referralStats.levelB.earnings + referralStats.levelC.earnings;
  const conversionRate = totalReferrals > 0 ? Math.round((referredUsers.filter(r => r.level === "A").length / Math.max(totalReferrals, 1)) * 100) : 0;

  // Chart data
  const earningsByLevelData = [
    { name: 'Level A (10%)', value: referralStats.levelA.earnings, fill: 'hsl(var(--primary))' },
    { name: 'Level B (5%)', value: referralStats.levelB.earnings, fill: 'hsl(var(--info))' },
    { name: 'Level C (3%)', value: referralStats.levelC.earnings, fill: 'hsl(var(--success))' },
  ];

  const referralsByLevelData = [
    { level: 'Level A', count: referralStats.levelA.count, earnings: referralStats.levelA.earnings },
    { level: 'Level B', count: referralStats.levelB.count, earnings: referralStats.levelB.earnings },
    { level: 'Level C', count: referralStats.levelC.count, earnings: referralStats.levelC.earnings },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))'];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const shareReferralLink = async () => {
    // Add rate limiting check
    const lastShare = localStorage.getItem('lastShare');
    const now = Date.now();
    
    if (lastShare && (now - parseInt(lastShare)) < 5000) {
      toast({
        title: "Too Fast",
        description: "Please wait 5 seconds between shares",
        variant: "destructive"
      });
      return;
    }
    
    localStorage.setItem('lastShare', now.toString());
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Kinya Drive Cash",
          text: "Start earning daily returns with taxi investments! Use my referral link:",
          url: referralLink,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeRef.current) return;
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Set canvas size
    canvas.width = 250;
    canvas.height = 250;
    
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `referral-qr-${referralCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast({
        title: "Success",
        description: "QR code downloaded successfully"
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const exportReferralsCSV = () => {
    const headers = ['Name', 'Level', 'Join Date', 'Potential Commission'];
    const csvData = [
      headers.join(','),
      ...referredUsers.map(r => [
        r.full_name || 'Anonymous',
        r.level,
        new Date(r.created_at).toLocaleDateString(),
        'KES 100'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-referrals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Exported",
      description: "Referrals exported to CSV successfully"
    });
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = {
      A: { color: "bg-primary/10 text-primary border-primary", label: "Level A (10%)" },
      B: { color: "bg-info/10 text-info border-info", label: "Level B (5%)" },
      C: { color: "bg-success/10 text-success border-success", label: "Level C (3%)" }
    };
    const config = levelConfig[level as keyof typeof levelConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  const getRankReward = (rank: number) => {
    if (rank === 1) return "🏆 Top Referrer Badge + 500 KES Bonus";
    if (rank === 2) return "🥈 Silver Badge + 300 KES Bonus";
    if (rank === 3) return "🥉 Bronze Badge + 200 KES Bonus";
    if (rank <= 10) return "⭐ Top 10 Badge";
    return null;
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the referral program</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Referral Program
          </h1>
          <p className="text-white/80">Earn commission from your referrals deposits</p>
          
          {/* Wallet Balance Display */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Earnings Wallet</p>
              <p className="text-xl font-bold text-green-300">KES {wallet?.earnings_balance?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <p className="text-xs text-white/70">Withdrawable</p>
              <p className="text-xl font-bold">KES {withdrawableBalance.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Referral Earnings</p>
              <p className="text-xl font-bold text-yellow-300">KES {totalEarningsAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="share" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="share">Share Link</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-6">
            {/* Referral Link Section */}
            <Card className="border-0 shadow-soft bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Your Unique Referral Link
                </CardTitle>
                <CardDescription>Share this link to earn commissions from your referrals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Referral Code</label>
                  <div className="flex gap-2">
                    <Input value={referralCode} readOnly className="font-mono text-lg" />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => copyToClipboard(referralCode, "Referral code")}
                      aria-label="Copy referral code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Referral Link</label>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="text-sm" />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => copyToClipboard(referralLink, "Referral link")}
                      aria-label="Copy referral link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={shareReferralLink} className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300" size="lg">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Referral Link
                </Button>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Share your unique referral link with friends. When they sign up using your link and make deposits, you earn commission based on their investment level!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Section */}
            <Card className="border-0 shadow-soft bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
                <CardDescription>Let others scan this code to sign up with your referral link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div ref={qrCodeRef} className="bg-white p-6 rounded-lg shadow-soft">
                    {referralLink && (
                      <QRCode value={referralLink} size={200} level="H" fgColor="#000000" bgColor="#ffffff" />
                    )}
                  </div>
                  <Button onClick={downloadQRCode} variant="outline" className="w-full max-w-xs">
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Share this QR code on social media, posters, or in person. Anyone can scan it to sign up!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Share Buttons */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Quick Share Options
                </CardTitle>
                <CardDescription>Share via social media or messaging apps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Join Kinya Drive Cash and start earning daily! Use my referral link: " + referralLink)}`, "_blank")} 
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                    aria-label="Share on WhatsApp"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join Kinya Drive Cash and earn daily!")}`, "_blank")} 
                    className="bg-[#0088cc] hover:bg-[#006699] text-white"
                    aria-label="Share on Telegram"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Telegram
                  </Button>
                  <Button 
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank")} 
                    className="bg-[#1877F2] hover:bg-[#145DBF] text-white"
                    aria-label="Share on Facebook"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join Kinya Drive Cash and earn daily!")}`, "_blank")} 
                    className="bg-[#1DA1F2] hover:bg-[#1A8CD8] text-white"
                    aria-label="Share on Twitter"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">KES {totalEarningsAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time commission</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level A</CardTitle>
                  <Gift className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{referralStats.levelA.count}</div>
                  <p className="text-xs text-muted-foreground">KES {referralStats.levelA.earnings.toLocaleString()} earned</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level B</CardTitle>
                  <Gift className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">{referralStats.levelB.count}</div>
                  <p className="text-xs text-muted-foreground">KES {referralStats.levelB.earnings.toLocaleString()} earned</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level C</CardTitle>
                  <Gift className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{referralStats.levelC.count}</div>
                  <p className="text-xs text-muted-foreground">KES {referralStats.levelC.earnings.toLocaleString()} earned</p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>How Referral Commissions Work</CardTitle>
                <CardDescription>Earn commission on deposits from your referral network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-primary">10%</span>
                    </div>
                    <h3 className="font-semibold">Level A - Direct Referrals</h3>
                    <p className="text-sm text-muted-foreground">
                      Earn 10% commission on every deposit made by users you directly refer
                    </p>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-info">5%</span>
                    </div>
                    <h3 className="font-semibold">Level B - Second Level</h3>
                    <p className="text-sm text-muted-foreground">
                      Earn 5% commission on deposits from users referred by your direct referrals
                    </p>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-success">3%</span>
                    </div>
                    <h3 className="font-semibold">Level C - Third Level</h3>
                    <p className="text-sm text-muted-foreground">
                      Earn 3% commission on deposits from third level referrals in your network
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalReferrals}</div>
                  <p className="text-xs text-muted-foreground">Across all levels</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">KES {totalEarningsAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Commission earned</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft bg-gradient-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{userRank ? `#${userRank}` : '-'}</div>
                  <p className="text-xs text-muted-foreground">On leaderboard</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earnings by Level Pie Chart */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Earnings by Level
                  </CardTitle>
                  <CardDescription>Distribution of your referral earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={earningsByLevelData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {earningsByLevelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `KES ${value}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Referrals by Level Bar Chart */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Referrals & Earnings by Level
                  </CardTitle>
                  <CardDescription>Number of referrals and earnings per level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referralsByLevelData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="level" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'count' ? value : `KES ${value}`,
                            name === 'count' ? 'Referrals' : 'Earnings'
                          ]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" name="Referrals" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="earnings" fill="hsl(var(--success))" name="Earnings" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Stats */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Referral Performance</CardTitle>
                <CardDescription>Your referral program statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-card rounded-lg">
                    <div className="text-2xl font-bold text-primary">{referralStats.levelA.count}</div>
