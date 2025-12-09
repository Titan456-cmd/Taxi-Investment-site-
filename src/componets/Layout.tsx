import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Car, 
  LayoutDashboard, 
  TrendingUp, 
  CreditCard, 
  ArrowUpRight, 
  Users, 
  History, 
  User, 
  Info, 
  HelpCircle, 
  Menu,
  Sun,
  Moon,
  LogOut,
  Shield
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { JoyAssistant } from "@/components/JoyAssistant";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const baseNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invest", href: "/invest", icon: TrendingUp },
    { name: "Deposit", href: "/deposit", icon: CreditCard },
    { name: "Withdraw", href: "/withdraw", icon: ArrowUpRight },
    { name: "Referrals", href: "/referrals", icon: Users },
    { name: "History", href: "/history", icon: History },
    { name: "Profile", href: "/profile", icon: User },
    { name: "About Us", href: "/about", icon: Info },
    { name: "Support", href: "/support", icon: HelpCircle },
  ];

  const adminNavigation = [
    { name: "Admin Dashboard", href: "/admin", icon: Shield },
  ];

  const navigation = isAdmin ? [...adminNavigation, ...baseNavigation] : baseNavigation;

  const isActive = (href: string) => location.pathname === href;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const NavItems = () => (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-primary/10 ${
              isActive(item.href)
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-72 md:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Kinya Drive Cash
            </span>
          </div>
          <NavItems />
          <div className="mt-auto space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start gap-2"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex h-16 items-center justify-between bg-card border-b px-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              Kinya Drive Cash
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-gradient-primary p-2 rounded-lg">
                    <Car className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Kinya Drive Cash
                  </span>
                </div>
                <NavItems />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-72">
        {children}
      </div>
      <JoyAssistant />
    </div>
  );
};

export default Layout;
