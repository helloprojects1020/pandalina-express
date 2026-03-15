import Hero from '@/components/Hero';
import { BestSellers, PlattersPreview } from '@/components/HomeSections';
import MeetChef from '@/components/MeetChef';
import MenuSection from '@/components/MenuSection';
import WhyOrderSection from '@/components/WhyOrderSection';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* 1. Hero */}
      <Hero />
      {/* 2. Best Sellers / Featured */}
      <BestSellers />
      {/* 3. Platters */}
      <PlattersPreview />
      {/* 4. Meet Our Chef */}
      <MeetChef />
      {/* 5. Why Pandalina */}
      <WhyOrderSection />
      {/* 6. Menu Preview (remaining categories) */}
      <MenuSection />
      {/* 7. WhatsApp CTA */}
      <WhatsAppCTA />
      {/* 8. Footer */}
      <Footer />
    </div>
  );
};

export default Index;
