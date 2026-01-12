import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import Marketplace from "./pages/Marketplace";
import Services from "./pages/Services";
import CreateServer from "./pages/CreateServer";
import ArcanaProjects from "./pages/ArcanaProjects";
import SellerOnboarding from "./pages/SellerOnboarding";
import SellerDashboard from "./pages/SellerDashboard";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import PublishListing from "./pages/PublishListing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/services" element={<Services />} />
            <Route path="/create-server" element={<CreateServer />} />
            <Route path="/arcana-projects" element={<ArcanaProjects />} />
            <Route path="/seller-onboarding" element={<SellerOnboarding />} />
            <Route path="/seller-dashboard" element={<SellerDashboard />} />
            <Route path="/seller-dashboard/create" element={<CreateListing />} />
            <Route path="/seller-dashboard/edit/:id" element={<EditListing />} />
            <Route path="/seller-dashboard/publish/:id" element={<PublishListing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
