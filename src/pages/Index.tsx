import Hero from '@/components/Hero';
import CategoryCards from '@/components/CategoryCards';
import { BestSellers } from '@/components/HomeSections';
import MenuSection from '@/components/MenuSection';
import MeetChef from '@/components/MeetChef';
import WhyOrderSection from '@/components/WhyOrderSection';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <CategoryCards />
      <BestSellers />
      <MenuSection />
      <MeetChef />
      <WhyOrderSection />
      <WhatsAppCTA />
      <Footer />
    </div>
  );
};

export default Index;
