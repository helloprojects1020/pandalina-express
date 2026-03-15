import { Leaf, Zap, ChefHat, Users } from 'lucide-react';

const features = [
  { icon: Leaf, title: 'Fresh Ingredients', desc: 'Quality fish & produce daily' },
  { icon: Zap, title: 'Fast Takeaway', desc: 'Ready in 20–30 minutes' },
  { icon: ChefHat, title: 'Street Food Vibes', desc: 'Authentic Asian flavors' },
  { icon: Users, title: 'Sharing Platters', desc: 'Perfect for groups & parties' },
];

const WhyOrderSection = () => (
  <section className="py-12 px-4 max-w-screen-xl mx-auto">
    <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-6">
      Why Pandalina
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

export default WhyOrderSection;
