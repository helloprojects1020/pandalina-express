import { Leaf, Zap, ChefHat, Users } from 'lucide-react';
import { useI18n } from '@/i18n/context';

const WhyOrderSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: Leaf, title: t.why.fresh_title, desc: t.why.fresh_desc },
    { icon: Zap, title: t.why.fast_title, desc: t.why.fast_desc },
    { icon: ChefHat, title: t.why.street_title, desc: t.why.street_desc },
    { icon: Users, title: t.why.sharing_title, desc: t.why.sharing_desc },
  ];

  return (
    <section className="py-12 px-4 max-w-screen-xl mx-auto">
      <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-6">
        {t.why.title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((f) => (
          <div key={f.title} className="bg-card rounded-2xl p-5 shadow-card flex flex-col items-start">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-sm text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyOrderSection;
