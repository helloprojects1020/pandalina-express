import { useI18n } from '@/i18n/context';
import { ChefHat, Flame, Heart } from 'lucide-react';
import heroImg from '@/assets/hero-sushi.jpg';
import kitchen2 from '@/assets/kitchen-2.jpg';
import Footer from '@/components/Footer';

const About = () => {
  const { t } = useI18n();

  const values = [
    { icon: ChefHat, title: t.about.val1_title, desc: t.about.val1_desc },
    { icon: Flame, title: t.about.val2_title, desc: t.about.val2_desc },
    { icon: Heart, title: t.about.val3_title, desc: t.about.val3_desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-accent/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl tracking-tighter uppercase text-primary-foreground">
            {t.about.title}
          </h1>
        </div>
      </div>

      {/* Story */}
      <section className="py-12 px-4 max-w-screen-md mx-auto">
        <div className="space-y-4 text-base text-muted-foreground leading-relaxed font-body">
          <p>{t.about.p1}</p>
          <p>{t.about.p2}</p>
        </div>

        <div className="my-8 rounded-2xl overflow-hidden aspect-video">
          <img src={kitchen2} alt="" className="w-full h-full object-cover" />
        </div>

        <p className="text-base text-muted-foreground leading-relaxed font-body">{t.about.p3}</p>
      </section>

      {/* Values */}
      <section className="py-12 px-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-6 text-center">
          {t.about.values_title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {values.map((v) => (
            <div key={v.title} className="bg-card rounded-2xl p-6 shadow-card text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
