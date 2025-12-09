import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TransactionProvider } from "./contexts/TransactionContext";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Invest from "./pages/Invest";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Referrals from "./pages/Referrals";
import History from "./pages/History";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Support from "./pages/Support";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TransactionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/invest" element={<Layout><Invest /></Layout>} />
                <Route path="/deposit" element={<Layout><Deposit /></Layout>} />
                <Route path="/withdraw" element={<Layout><Withdraw /></Layout>} />
                <Route path="/referrals" element={<Layout><Referrals /></Layout>} />
                <Route path="/history" element={<Layout><History /></Layout>} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/about" element={<Layout><About /></Layout>} />
                <Route path="/support" element={<Layout><Support /></Layout>} />
                <Route path="/admin" element={<Layout><Admin /></Layout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TransactionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
