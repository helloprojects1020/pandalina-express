/**
 * Bitelyx visual template — public barrel.
 * Import everything from this single path on the platform side:
 *
 *   import { Header, Hero, MenuSection, PLATFORM_TOKENS, type HeroProps } from '@bitelyx/template';
 */

export { default as Header }            from './components/Header';
export type { HeaderProps, NavLink }    from './components/Header';

export { default as Hero }              from './components/Hero';
export type { HeroProps, HeroSlide }    from './components/Hero';

export { default as CategoryCards }                  from './components/CategoryCards';
export type { CategoryCardsProps, CategoryCardItem } from './components/CategoryCards';

export { default as CategoryNav }                  from './components/CategoryNav';
export type { CategoryNavProps, CategoryNavItem }  from './components/CategoryNav';

export { default as BestSellers }       from './components/BestSellers';
export type { BestSellersProps }        from './components/BestSellers';

export { default as ProductCard }                       from './components/ProductCard';
export type { ProductCardProps, ProductCardData }       from './components/ProductCard';

export { default as MenuSection }                        from './components/MenuSection';
export type { MenuSectionProps, MenuCategoryGroup }      from './components/MenuSection';

export { default as PlattersPreview }   from './components/PlattersPreview';
export type { PlattersPreviewProps }    from './components/PlattersPreview';

export { default as MeetChef }          from './components/MeetChef';
export type { MeetChefProps }           from './components/MeetChef';

export { default as WhyOrderSection }                       from './components/WhyOrderSection';
export type { WhyOrderSectionProps, WhyFeature, WhyIconName } from './components/WhyOrderSection';

export { default as WhatsAppCTA }       from './components/WhatsAppCTA';
export type { WhatsAppCTAProps }        from './components/WhatsAppCTA';

export { default as Footer }                          from './components/Footer';
export type { FooterProps, FooterSocial }             from './components/Footer';

export { default as FloatingCart }      from './components/FloatingCart';
export type { FloatingCartProps }       from './components/FloatingCart';

export { default as CartDrawer }                       from './components/CartDrawer';
export type { CartDrawerProps, CartLineItem }          from './components/CartDrawer';

export * from './tokens';
export * from './types';