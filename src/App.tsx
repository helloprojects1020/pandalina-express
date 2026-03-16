import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import { AuthProvider } from "@/hooks/useAuth";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import FloatingCart from "@/components/FloatingCart";
import CheckoutSheet from "@/components/CheckoutSheet";
import PasswordGate from "@/components/PasswordGate";
import EditProductModal from "@/components/EditProductModal";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminMenu from "./pages/admin/AdminMenu.tsx";
import AdminMenuItems from "./pages/admin/AdminMenuItems.tsx";
import AdminOptions from "./pages/admin/AdminOptions.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Admin routes — no PasswordGate, no SiteHeader */}
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

              {/* Public routes — with PasswordGate and SiteHeader */}
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
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
