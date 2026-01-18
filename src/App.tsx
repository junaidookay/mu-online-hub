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
import ListingDetail from "./pages/ListingDetail";
import SellerEarnings from "./pages/SellerEarnings";
import SellerProfile from "./pages/SellerProfile";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDirectory from "./pages/SellerDirectory";
import Messages from "./pages/Messages";
import Servers from "./pages/Servers";
import MarketplaceAds from "./pages/MarketplaceAds";
import ServicesAds from "./pages/ServicesAds";
import Partners from "./pages/Partners";
import ArcanaProjectsPage from "./pages/ArcanaProjectsPage";
import ManageCategories from "./pages/ManageCategories";
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
            <Route path="/marketplace/:id" element={<ListingDetail />} />
            <Route path="/services" element={<Services />} />
            <Route path="/create-server" element={<CreateServer />} />
            <Route path="/arcana-projects" element={<ArcanaProjects />} />
            <Route path="/seller-onboarding" element={<SellerOnboarding />} />
            <Route path="/seller" element={<SellerDashboard />} />
            <Route path="/seller/create" element={<CreateListing />} />
            <Route path="/seller/edit/:id" element={<EditListing />} />
            <Route path="/seller/publish/:id" element={<PublishListing />} />
            <Route path="/seller/earnings" element={<SellerEarnings />} />
            <Route path="/seller/profile/:sellerId" element={<SellerProfile />} />
            <Route path="/seller-dashboard" element={<SellerDashboard />} />
            <Route path="/seller-dashboard/create" element={<CreateListing />} />
            <Route path="/seller-dashboard/edit/:id" element={<EditListing />} />
            <Route path="/seller-dashboard/publish/:id" element={<PublishListing />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/seller/manage-categories" element={<ManageCategories />} />
            <Route path="/sellers" element={<SellerDirectory />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:partnerId" element={<Messages />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/marketplace-ads" element={<MarketplaceAds />} />
            <Route path="/services-ads" element={<ServicesAds />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/arcana-projects-all" element={<ArcanaProjectsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
