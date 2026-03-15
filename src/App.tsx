import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/context";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import FloatingCart from "@/components/FloatingCart";
import CheckoutSheet from "@/components/CheckoutSheet";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppLayout = () => (
  <>
    <SiteHeader />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <FloatingCart />
    <CartDrawer />
    <CheckoutSheet />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
