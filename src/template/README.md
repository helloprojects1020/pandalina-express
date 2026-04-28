# Bitelyx Visual Template

A pure presentational component library for Bitelyx restaurant sites.
Every component is **dumb**: it accepts data + callbacks via props and renders
JSX. There is no internal state for business logic, no routing, no data
fetching, no i18n context, no Supabase, nothing.

Import everything from one place:

```ts
import {
  Header, Hero, MenuSection, CartDrawer,
  PLATFORM_TOKENS,
  type HeroProps, type ProductCardData,
} from '@/template';
```

See `pages/DemoPage.tsx` for a complete working example with mock data
and a light/dark + ltr/rtl toggle. The route `/template` renders it.

---

## Components

All components live in `src/template/components/` and accept `dir` (`'ltr' | 'rtl'`)
and `tokens` (`BitelyxTokens`) as the first two props.

| Component         | Props interface         | What it shows |
|-------------------|-------------------------|---------------|
| `Header`          | `HeaderProps`           | Sticky top bar: logo, nav links, language switcher, cart button, optional banner strip, mobile drawer toggle. |
| `Hero`            | `HeroProps`             | Full-bleed slideshow with logo, title/tagline per slide, three CTAs (menu / WhatsApp / group order), trust line and dot indicators. |
| `CategoryCards`   | `CategoryCardsProps`    | Grid of clickable category tiles with image and overlay label. |
| `CategoryNav`     | `CategoryNavProps`      | Horizontal pill-style sticky category navigation. |
| `BestSellers`     | `BestSellersProps`      | 4-up grid of `ProductCard` highlighting featured items. |
| `ProductCard`     | `ProductCardProps`      | Single product tile with image, badge, price, quick-add button, and out-of-stock state. Has `default` and `premium` variants. |
| `MenuSection`     | `MenuSectionProps`      | Sticky `CategoryNav` + per-category preview grids of `ProductCard`. |
| `PlattersPreview` | `PlattersPreviewProps`  | 2-up wide preview of premium platters with view-all link. |
| `MeetChef`        | `MeetChefProps`         | Editorial side-by-side chef portrait + bio block. |
| `WhyOrderSection` | `WhyOrderSectionProps`  | 4-up icon-feature grid (icon name, title, description). |
| `WhatsAppCTA`     | `WhatsAppCTAProps`      | Large rounded call-to-action card with background image and a WhatsApp button. |
| `Footer`          | `FooterProps`           | Brand block, two-column contact + hours, social icons, copyright + powered-by line. |
| `FloatingCart`    | `FloatingCartProps`     | Bottom-center pill that appears when cart has items, opens the cart drawer. |
| `CartDrawer`      | `CartDrawerProps`       | Right-side drawer listing cart lines with qty controls, edit/remove, subtotal, checkout button, empty state. |

---

## Tokens contract

Every component takes a `tokens: BitelyxTokens` prop. The interface lives in
`tokens.ts`. Pass either of the demo palettes (`demoLightTokens`,
`demoDarkTokens`) for the standalone demo, or `PLATFORM_TOKENS` (which
resolves CSS variables defined by the host app at runtime).

| Key          | What it controls |
|--------------|------------------|
| `bg`         | Page / section background. |
| `surface`    | Card surfaces, drawers, floating containers. |
| `surfaceAlt` | Subtle alternative surface (chips, hovers, filled icon buttons). |
| `text`       | Primary text on `bg` / `surface`. |
| `muted`      | Secondary text, descriptions, captions, disabled text. |
| `border`     | Hairline borders and dividers. |
| `accent`     | Primary brand colour: CTA fills, badges, prices, active nav pill. |
| `accentText` | Foreground text/icon colour used **on** `accent`. |
| `accentSoft` | Tinted accent background for icon chips and subtle highlights. |
| `success`    | "Open now" / "Available" indicators. |
| `danger`     | Out-of-stock badge, destructive actions (clear cart, remove). |

`PLATFORM_TOKENS` references these CSS variables — define them on the host
app's root (e.g. per-restaurant theme):

```css
:root {
  --tt-bg:            0 0% 100%;
  --tt-surface:       0 0% 100%;
  --tt-text:          0 0% 10%;
  --tt-muted:         0 0% 45%;
  --tt-border:        0 0% 90%;
  --tt-accent:        347 77% 50%;
  --tt-accent-text:   0 0% 100%;
  --tt-accent-alpha:  347 77% 50% / 0.10;
  --destructive:      0 72% 51%;
}
```

---

## Routing

Components don't know about routing. Wherever a link would normally go:

- **You pass an `href` string** (e.g. `Header.links[].href`, `Hero.ctaMenuHref`,
  `CategoryCards.items[].href`, `MenuSection.categories[].href`,
  `Footer.phoneHref`, `Footer.socials[].href`, `WhatsAppCTA.buttonHref`).
- **You pass an `onSelect(id)` / `onCartOpen()` / `onQuickAdd(id)` callback**
  for actions that should not navigate (selecting a category in the sticky nav,
  opening the cart drawer, adding to cart, etc.).

If you use react-router, wrap your render to translate `href`/`onSelect` to
`<Link to>` / `navigate()` on the platform side. The template never imports
from `react-router`.

---

## Internationalisation

- Every visible string is a prop. There are **no hardcoded human-language
  strings** in JSX, className values, alt text, aria-labels, placeholders,
  empty states, or button labels.
- Direction is controlled per-component via the `dir` prop (`'ltr' | 'rtl'`).
  Components use Tailwind logical properties (`start`/`end`/`ps`/`pe`/`ms`/`me`).
- The platform is responsible for translating its own strings before passing
  them in.

---

## Image / video fallbacks

All `imageUrl`, `logoUrl`, `videoUrl`, `posterUrl`, `iconUrl`, and
`backgroundImageUrl` props are optional. When omitted, components render a
neutral placeholder using `tokens.surfaceAlt` and a small `lucide-react` icon,
so restaurants without uploaded media still get a polished layout.

---

## Scoping CSS overrides

Every root element has a `data-template-component="<ComponentName>"` attribute
so you can target a specific component without touching the source:

```css
[data-template-component="Hero"] h1 { letter-spacing: -0.04em; }
[data-template-component="ProductCard"] { border-radius: 24px; }
```