import Hero from '@/components/Hero';
import { BestSellers, PlattersPreview } from '@/components/HomeSections';
import MenuSection from '@/components/MenuSection';
import WhyOrderSection from '@/components/WhyOrderSection';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <BestSellers />
      <PlattersPreview />
      <WhyOrderSection />
      <MenuSection />
      <WhatsAppCTA />
      <Footer />
    </div>
  );
};

export default Index;
