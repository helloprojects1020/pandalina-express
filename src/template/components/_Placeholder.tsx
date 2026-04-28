import { ImageOff, type LucideIcon } from 'lucide-react';
import type { BitelyxTokens } from '../tokens';

export interface PlaceholderProps {
  tokens: BitelyxTokens;
  /** Tailwind aspect class, e.g. 'aspect-square', 'aspect-[16/10]'. */
  aspectClass?: string;
  /** Optional Lucide icon override. Defaults to ImageOff. */
  Icon?: LucideIcon;
  /** Extra classes (e.g. rounded-xl). */
  className?: string;
  ariaLabel?: string;
}

/**
 * Neutral placeholder used when an image/video URL is missing. Keeps the
 * layout intact for restaurants that haven't uploaded media yet.
 */
const Placeholder = ({
  tokens,
  aspectClass = 'aspect-square',
  Icon = ImageOff,
  className = '',
  ariaLabel,
}: PlaceholderProps) => (
  <div
    role="img"
    aria-label={ariaLabel}
    className={`w-full h-full flex items-center justify-center ${aspectClass} ${className}`}
    style={{ background: tokens.surfaceAlt }}
  >
    <Icon className="w-8 h-8 opacity-40" style={{ color: tokens.muted }} />
  </div>
);

export default Placeholder;