/**
 * Bitelyx visual template — design tokens contract.
 * Every presentational component receives a `tokens` prop matching this shape.
 * The platform passes per-restaurant theme values at runtime.
 */
export interface BitelyxTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  success: string;
  danger: string;
}

export type Dir = 'rtl' | 'ltr';

/** Default neutral light palette used by the demo page. */
export const demoLightTokens: BitelyxTokens = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f4',
  text: '#1a1a1a',
  muted: '#737373',
  border: '#e5e5e5',
  accent: '#e11d48',
  accentText: '#ffffff',
  accentSoft: 'rgba(225,29,72,0.10)',
  success: '#16a34a',
  danger: '#dc2626',
};

/** Default neutral dark palette used by the demo page when toggled. */
export const demoDarkTokens: BitelyxTokens = {
  bg: '#0b0b0c',
  surface: '#161618',
  surfaceAlt: '#1f1f22',
  text: '#fafafa',
  muted: '#a1a1aa',
  border: '#2a2a2e',
  accent: '#fb7185',
  accentText: '#0b0b0c',
  accentSoft: 'rgba(251,113,133,0.15)',
  success: '#22c55e',
  danger: '#ef4444',
};