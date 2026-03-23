import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import { AuthProvider } from "@/hooks/useAuth";
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
import AdminSettings from "./pages/admin/AdminSettings";
import KitchenScreen from "./pages/KitchenScreen";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";

const queryClient = new QueryClient();

const AppLayout = () => (
  <>
    <SiteHeader />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <FloatingCart />
    <CartDrawer />
    <CheckoutSheet />
    <EditProductModal />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <MenuProvider restaurantSlug="pandalina">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
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
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route
                  path="/kitchen"
                  element={
                    <ProtectedRoute>
                      <KitchenScreen />
                    </ProtectedRoute>
                  }
                />

                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/failure" element={<PaymentFailure />} />

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
        </MenuProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;