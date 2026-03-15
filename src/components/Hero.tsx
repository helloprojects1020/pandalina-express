import { motion } from 'framer-motion';
import heroImg from '@/assets/hero-sushi.jpg';
import logoImg from '@/assets/logo.png';

const Hero = () => {
  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Fresh sushi rolls"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-accent via-accent/70 to-accent/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 pb-12 pt-20 md:pb-20 md:px-8 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-lg"
        >
          <img src={logoImg} alt="Pandalina" className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-2xl" />
          <h1 className="text-4xl md:text-6xl lg:text-7xl tracking-tighter uppercase leading-[0.9] text-primary-foreground mb-3">
            Pandalina
          </h1>
          <p className="font-display text-lg md:text-2xl tracking-tight uppercase text-primary-foreground/80 mb-4">
            Asian Street Bar
          </p>
          <p className="font-body text-[15px] md:text-base text-primary-foreground/60 mb-8 max-w-sm">
            Fresh Sushi • Asian Street Food • Fast Takeaway
          </p>

          <div className="flex gap-3">
            <button
              onClick={scrollToMenu}
              className="h-12 px-7 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wide active:scale-95 transition-transform"
            >
              View Menu
            </button>
            <a
              href="https://wa.me/972503009005"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-7 rounded-full border border-primary-foreground/30 text-primary-foreground font-bold text-sm tracking-wide flex items-center active:scale-95 transition-transform"
            >
              Order on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
