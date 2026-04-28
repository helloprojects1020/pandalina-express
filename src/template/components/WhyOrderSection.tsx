import { Leaf, Zap, ChefHat, Users, type LucideIcon } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export type WhyIconName = 'leaf' | 'zap' | 'chef-hat' | 'users';

const ICON_MAP: Record<WhyIconName, LucideIcon> = {
  leaf: Leaf,
  zap: Zap,
  'chef-hat': ChefHat,
  users: Users,
};

export interface WhyFeature {
  icon: WhyIconName;
  title: string;
  description: string;
}

export interface WhyOrderSectionProps {
  dir: Dir;
  tokens: BitelyxTokens;
  title: string;
  features: WhyFeature[];
}

const WhyOrderSection = ({ dir, tokens, title, features }: WhyOrderSectionProps) => (
  <section data-template-component="WhyOrderSection" dir={dir} className="py-12 px-4 max-w-screen-xl mx-auto" style={{ background: tokens.bg }}>
    <h2 className="text-2xl md:text-3xl tracking-tighter uppercase mb-6" style={{ color: tokens.text }}>{title}</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map((f) => {
        const Icon = ICON_MAP[f.icon];
        return (
          <div
            key={f.title}
            className="rounded-2xl p-5 shadow-sm flex flex-col items-start"
            style={{ background: tokens.surface }}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: tokens.accentSoft }}>
              <Icon className="w-5 h-5" style={{ color: tokens.accent }} />
            </div>
            <h3 className="font-bold text-sm" style={{ color: tokens.text }}>{f.title}</h3>
            <p className="text-xs mt-1" style={{ color: tokens.muted }}>{f.description}</p>
          </div>
        );
      })}
    </div>
  </section>
);

export default WhyOrderSection;
