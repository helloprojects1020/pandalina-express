import Hero from '@/components/Hero';
import CategoryCards from '@/components/CategoryCards';
import MeetChef from '@/components/MeetChef';
import MenuSection from '@/components/MenuSection';
import WhyOrderSection from '@/components/WhyOrderSection';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <CategoryCards />
      <MeetChef />
      <MenuSection />
      <WhyOrderSection />
      <WhatsAppCTA />
      <Footer />
    </div>
  );
};

export default Index;
