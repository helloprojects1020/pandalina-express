import logoImg from '@/assets/logo.png';

const Footer = () => (
  <footer className="bg-accent text-accent-foreground py-10 px-4">
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Pandalina" className="w-10 h-10 rounded-lg" />
          <div>
            <h3 className="font-display text-base">Pandalina</h3>
            <p className="text-xs text-accent-foreground/50">Asian Street Bar</p>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-bold text-sm mb-2">Contact</h4>
          <p className="text-sm text-accent-foreground/60">📞 050-300-9005</p>
          <p className="text-sm text-accent-foreground/60">📍 Address coming soon</p>
        </div>

        {/* Hours */}
        <div>
          <h4 className="font-bold text-sm mb-2">Opening Hours</h4>
          <p className="text-sm text-accent-foreground/60">Sun–Thu: 11:00–23:00</p>
          <p className="text-sm text-accent-foreground/60">Fri: 11:00–15:00</p>
          <p className="text-sm text-accent-foreground/60">Sat: 20:00–23:00</p>
        </div>
      </div>

      <div className="border-t border-accent-foreground/10 mt-8 pt-6 text-center">
        <p className="text-xs text-accent-foreground/40">© {new Date().getFullYear()} Pandalina — Asian Street Bar. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
