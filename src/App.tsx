import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import { AuthProvider } from "@/hooks/useAuth";
import { FeatureFlagsProvider } from "@/hooks/useFeatureFlags";
import { MenuProvider } from "@/hooks/useMenu";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import FloatingCart from "@/components/FloatingCart";
import CheckoutSheet from "@/components/CheckoutSheet";
import PasswordGate from "@/components/PasswordGate";
import EditProductModal from "@/components/EditProductModal";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CategoryPage from "./pages/CategoryPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminMenuItems from "./pages/admin/AdminMenuItems";
import AdminOptions from "./pages/admin/AdminOptions";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustumers";
import AdminDeliveryZones from "./pages/admin/AdminDeliveryZones";
import AdminExport from "./pages/admin/AdminExport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCosting from "./pages/admin/AdminCosting";
import AdminMenuPerformance from "./pages/admin/AdminMenuPerformance";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminDaily from "./pages/admin/AdminDaily";
import AdminReminders from "./pages/admin/AdminReminders";
import AdminReportXZ from "./pages/admin/AdminReportXZ";
import AdminPlatformControl from "./pages/admin/AdminPlatformControl";
import KitchenScreen from "./pages/KitchenScreen";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import { getRestaurantSlug } from "@/hooks/useRestaurantSlug";

const queryClient = new QueryClient();

// ── Restaurant slug resolved once from hostname ───────────────────────────────
const RESTAURANT_SLUG = getRestaurantSlug();

// ── Public site layout — no slug in URL, resolved from hostname ───────────────
const AppLayout = () => (
  <MenuProvider restaurantSlug={RESTAURANT_SLUG}>
    <SiteHeader />
    <Routes>
      <Route index element={<Index />} />
      <Route path="category/:categorySlug" element={<CategoryPage />} />
      <Route path="about" element={<About />} />
      <Route path="contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <FloatingCart />
    <CartDrawer />
    <CheckoutSheet />
    <EditProductModal />
  </MenuProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin panel */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<AdminMenu />} />
                <Route path="menu/items" element={<AdminMenuItems />} />
                <Route path="menu/options" element={<AdminOptions />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="delivery-zones" element={<AdminDeliveryZones />} />
                <Route path="export" element={<AdminExport />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="costing" element={<AdminCosting />} />
                <Route path="menu-performance" element={<AdminMenuPerformance />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="daily" element={<AdminDaily />} />
                <Route path="report-xz" element={<AdminReportXZ />} />
                <Route path="reminders" element={<AdminReminders />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="platform" element={<AdminPlatformControl />} />
              </Route>

              {/* Kitchen */}
              <Route
                path="/kitchen"
                element={
                  <ProtectedRoute>
                    <KitchenScreen />
                  </ProtectedRoute>
                }
              />

              {/* Payments */}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />

              {/* Public restaurant site — hostname-based, no slug in path */}
              <Route
                path="/*"
                element={
                  <PasswordGate>
                    <AppLayout />
                  </PasswordGate>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;