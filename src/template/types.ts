/**
 * Demo data shapes used by DemoPage. These are NOT consumed directly by the
 * components — they're convenience aliases that mirror the props the
 * components expect. Use them as a reference when wiring real data on the
 * platform side.
 */
import type { ProductCardData } from './components/ProductCard';
import type { CategoryCardItem } from './components/CategoryCards';
import type { CartLineItem } from './components/CartDrawer';
import type { HeroSlide } from './components/Hero';
import type { MenuCategoryGroup } from './components/MenuSection';
import type { WhyFeature } from './components/WhyOrderSection';
import type { FooterSocial } from './components/Footer';
import type { NavLink } from './components/Header';

export type ProductDemo      = ProductCardData;
export type CategoryDemo     = CategoryCardItem;
export type CartLineDemo     = CartLineItem;
export type HeroSlideDemo    = HeroSlide;
export type MenuGroupDemo    = MenuCategoryGroup;
export type WhyFeatureDemo   = WhyFeature;
export type FooterSocialDemo = FooterSocial;
export type NavLinkDemo      = NavLink;