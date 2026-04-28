import type { BitelyxTokens, Dir } from '../tokens';

export interface MeetChefProps {
  dir: Dir;
  tokens: BitelyxTokens;
  eyebrow: string;
  name: string;
  bio: string;
  imageUrl: string;
}

const MeetChef = ({ dir, tokens, eyebrow, name, bio, imageUrl }: MeetChefProps) => (
  <section dir={dir} className="py-16 px-4" style={{ background: tokens.surfaceAlt }}>
    <div className="max-w-screen-lg mx-auto">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div className="w-full md:w-2/5 flex-shrink-0">
          <div className="relative aspect-[3/4] max-w-[280px] mx-auto md:max-w-none rounded-2xl overflow-hidden shadow-lg">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
        <div className="flex-1 text-center md:text-start space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>{eyebrow}</p>
          <h2 className="font-display text-2xl md:text-3xl" style={{ color: tokens.text }}>{name}</h2>
          <p className="leading-relaxed text-sm md:text-base max-w-lg mx-auto md:mx-0" style={{ color: tokens.muted }}>{bio}</p>
        </div>
      </div>
    </div>
  </section>
);

export default MeetChef;
