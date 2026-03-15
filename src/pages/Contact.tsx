import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { Phone, MapPin, Clock } from 'lucide-react';
import Footer from '@/components/Footer';

const Contact = () => {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.open(`https://wa.me/972503009005?text=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="py-12 px-4 max-w-screen-lg mx-auto">
        <h1 className="text-3xl md:text-5xl tracking-tighter uppercase text-foreground mb-8 text-center">
          {t.contact.title}
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-5 shadow-card flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground mb-1">{t.contact.phone_title}</h3>
                <a href="tel:+972503009005" className="text-sm text-muted-foreground hover:text-primary transition-colors">050-300-9005</a>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground mb-1">{t.contact.location_title}</h3>
                <p className="text-sm text-muted-foreground">{t.contact.location_desc}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-card flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground mb-1">{t.contact.hours_title}</h3>
                <p className="text-sm text-muted-foreground">{t.footer.hours_sun_thu}</p>
                <p className="text-sm text-muted-foreground">{t.footer.hours_fri}</p>
                <p className="text-sm text-muted-foreground">{t.footer.hours_sat}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-bold text-sm text-foreground block mb-1">{t.contact.name_label}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full h-12 px-4 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="font-bold text-sm text-foreground block mb-1">{t.contact.email_label}</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email"
                required
                className="w-full h-12 px-4 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="font-bold text-sm text-foreground block mb-1">{t.contact.message_label}</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >
              {t.contact.send}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
