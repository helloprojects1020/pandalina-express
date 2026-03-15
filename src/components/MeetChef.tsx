import chefImg from '@/assets/chef-fouzy-clean.jpg';
import { useI18n } from '@/i18n/context';

const MeetChef = () => {
  const { t } = useI18n();

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-full md:w-2/5 flex-shrink-0">
            <div className="relative aspect-[3/4] max-w-[280px] mx-auto md:max-w-none rounded-2xl overflow-hidden shadow-elevated">
              <img
                src={chefImg}
                alt={t.chef.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="flex-1 text-center md:text-start space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t.chef.title}
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">
              {t.chef.name}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-lg mx-auto md:mx-0">
              {t.chef.bio}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetChef;
