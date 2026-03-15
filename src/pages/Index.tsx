import Hero from '@/components/Hero';
import CategoryCards from '@/components/CategoryCards';
import MenuSection from '@/components/MenuSection';
import WhyOrderSection from '@/components/WhyOrderSection';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatingCart from '@/components/FloatingCart';
import CheckoutSheet from '@/components/CheckoutSheet';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <CategoryCards />
      <MenuSection />
      <WhyOrderSection />
      <WhatsAppCTA />
      <Footer />
      <FloatingCart />
      <CartDrawer />
      <CheckoutSheet />
    </div>
  );
};

export default Index;
