import { useMemo, useState } from 'react';
import {
  demoLightTokens,
  demoDarkTokens,
  type BitelyxTokens,
  type Dir,
} from '../tokens';
import Header from '../components/Header';
import Hero, { type HeroSlide } from '../components/Hero';
import CategoryCards, { type CategoryCardItem } from '../components/CategoryCards';
import BestSellers from '../components/BestSellers';
import MenuSection, { type MenuCategoryGroup } from '../components/MenuSection';
import PlattersPreview from '../components/PlattersPreview';
import MeetChef from '../components/MeetChef';
import WhyOrderSection, { type WhyFeature } from '../components/WhyOrderSection';
import WhatsAppCTA from '../components/WhatsAppCTA';
import Footer from '../components/Footer';
import CartDrawer, { type CartLineItem } from '../components/CartDrawer';
import FloatingCart from '../components/FloatingCart';
import type { ProductCardData } from '../components/ProductCard';

/* ───────── Inline mock data (for illustration only) ───────── */

const PLACEHOLDER_FOOD = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
const PLACEHOLDER_FOOD_2 = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80';
const PLACEHOLDER_FOOD_3 = 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80';
const PLACEHOLDER_FOOD_4 = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80';
const PLACEHOLDER_HERO = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&q=80';
const PLACEHOLDER_KITCHEN = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80';
const PLACEHOLDER_LOGO = 'https://api.dicebear.com/7.x/shapes/svg?seed=bitelyx&backgroundColor=e11d48';
const PLACEHOLDER_CHEF = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80';
const PLACEHOLDER_PLATTER = 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=1600&q=80';
const PLACEHOLDER_IG = 'https://cdn.simpleicons.org/instagram/E4405F';
const PLACEHOLDER_WA = 'https://cdn.simpleicons.org/whatsapp/25D366';

const heroSlides: HeroSlide[] = [
  { type: 'image', imageUrl: PLACEHOLDER_HERO, title: 'Fresh. Bold. Delivered.', tagline: 'Hand-crafted dishes from our kitchen to your door.' },
  { type: 'image', imageUrl: PLACEHOLDER_KITCHEN, title: 'Made to order', tagline: 'Every plate is wok-fired the moment you tap order.' },
  { type: 'image', imageUrl: PLACEHOLDER_FOOD, title: 'Built for sharing', tagline: 'Family platters that bring everyone to the table.' },
];

const buildItem = (id: string, name: string, price: number, image: string, opts: Partial<ProductCardData> = {}): ProductCardData => ({
  id,
  name,
  description: 'Chef-curated, made fresh on demand.',
  price,
  currencySymbol: '$',
  imageUrl: image,
  showAvailableBadge: true,
  availableLabel: 'Available',
  outOfStockLabel: 'Out of stock',
  ...opts,
});

const categoryCardItems: CategoryCardItem[] = [
  { id: 'rolls', name: 'Sushi Rolls', imageUrl: PLACEHOLDER_FOOD, href: '#category-rolls' },
  { id: 'noodles', name: 'Noodles', imageUrl: PLACEHOLDER_FOOD_2, href: '#category-noodles' },
  { id: 'platters', name: 'Platters', imageUrl: PLACEHOLDER_FOOD_3, href: '#category-platters' },
  { id: 'drinks', name: 'Drinks', imageUrl: PLACEHOLDER_FOOD_4, href: '#category-drinks' },
];

const bestSellerItems: ProductCardData[] = [
  buildItem('crunchy', 'Crunchy Roll', 14, PLACEHOLDER_FOOD, { badgeEmoji: '⭐', badgeLabel: 'Most Popular' }),
  buildItem('dragon', 'Dragon Roll', 18, PLACEHOLDER_FOOD_2, { badgeEmoji: '🔥', badgeLabel: "Chef's Choice" }),
  buildItem('rainbow', 'Rainbow Roll', 19, PLACEHOLDER_FOOD_3, { badgeEmoji: '👑', badgeLabel: 'Top Pick' }),
  buildItem('salmon', 'Crispy Salmon', 22, PLACEHOLDER_FOOD_4),
];

const menuGroups: MenuCategoryGroup[] = [
  {
    id: 'rolls',
    label: 'Sushi Rolls',
    description: 'Hand-rolled, perfectly bite-sized.',
    href: '#category-rolls',
    items: [
      buildItem('r1', 'Crunchy Roll', 14, PLACEHOLDER_FOOD),
      buildItem('r2', 'Dragon Roll', 18, PLACEHOLDER_FOOD_2),
      buildItem('r3', 'Rainbow Roll', 19, PLACEHOLDER_FOOD_3),
      buildItem('r4', 'Spicy Tuna', 16, PLACEHOLDER_FOOD_4),
      buildItem('r5', 'California Roll', 12, PLACEHOLDER_FOOD),
    ],
  },
  {
    id: 'noodles',
    label: 'Noodles',
    description: 'Wok-fired, bowl-warming comfort.',
    href: '#category-noodles',
    items: [
      buildItem('n1', 'Pad Thai', 15, PLACEHOLDER_FOOD_2),
      buildItem('n2', 'Yakisoba', 16, PLACEHOLDER_FOOD_3, { isOutOfStock: true }),
      buildItem('n3', 'Ramen Bowl', 18, PLACEHOLDER_FOOD_4),
      buildItem('n4', 'Lo Mein', 14, PLACEHOLDER_FOOD),
    ],
  },
];

const platterItems: ProductCardData[] = [
  buildItem('p1', 'Family Sushi Platter', 65, PLACEHOLDER_PLATTER, { premiumTag: 'Serves 4-6', badgeEmoji: '⭐', badgeLabel: 'Most Popular' }),
  buildItem('p2', 'Party Sushi Tray', 95, PLACEHOLDER_FOOD_3, { premiumTag: 'Serves 8-10', badgeEmoji: '👑', badgeLabel: 'Top Pick' }),
];

const whyFeatures: WhyFeature[] = [
  { icon: 'leaf', title: 'Always Fresh', description: 'Sourced daily from trusted partners.' },
  { icon: 'zap', title: 'Lightning Fast', description: 'From kitchen to door in under 30 minutes.' },
  { icon: 'chef-hat', title: 'Street Style', description: 'Authentic recipes, modern execution.' },
  { icon: 'users', title: 'Made for Sharing', description: 'Generous portions, family-style joy.' },
];

/* ───────── Demo page ───────── */

const DemoPage = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dir, setDir] = useState<Dir>('ltr');
  const tokens: BitelyxTokens = theme === 'light' ? demoLightTokens : demoDarkTokens;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(menuGroups[0].id);
  const [cartItems, setCartItems] = useState<CartLineItem[]>([
    { id: 'c1', name: 'Crunchy Roll', imageUrl: PLACEHOLDER_FOOD, optionsLabel: 'Extra spicy', quantity: 2, lineTotal: 28 },
  ]);
  const [cartOpen, setCartOpen] = useState(false);

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.lineTotal, 0), [cartItems]);
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  const handleQuickAdd = (id: string) => {
    setCartItems((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) {
        return prev.map((p) => (p.id === id ? { ...p, quantity: p.quantity + 1, lineTotal: p.lineTotal + p.lineTotal / p.quantity } : p));
      }
      const all = [...bestSellerItems, ...menuGroups.flatMap((g) => g.items), ...platterItems];
      const item = all.find((i) => i.id === id);
      if (!item) return prev;
      return [...prev, { id, name: item.name, imageUrl: item.imageUrl, quantity: 1, lineTotal: item.price }];
    });
  };

  const handleIncrement = (id: string) => {
    setCartItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: p.quantity + 1, lineTotal: p.lineTotal + p.lineTotal / p.quantity } : p)),
    );
  };
  const handleDecrement = (id: string) => {
    setCartItems((prev) =>
      prev
        .map((p) => {
          if (p.id !== id) return p;
          const unit = p.lineTotal / p.quantity;
          const q = p.quantity - 1;
          return { ...p, quantity: q, lineTotal: q * unit };
        })
        .filter((p) => p.quantity > 0),
    );
  };
  const handleRemove = (id: string) => setCartItems((prev) => prev.filter((p) => p.id !== id));

  return (
    <div dir={dir} style={{ background: tokens.bg, color: tokens.text, minHeight: '100vh' }}>
      {/* Demo controls (not part of template) */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs"
        style={{ background: tokens.surfaceAlt, color: tokens.muted, borderBottom: `1px solid ${tokens.border}` }}
      >
        <strong style={{ color: tokens.text }}>Bitelyx Template Demo</strong>
        <span>·</span>
        <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} className="underline">
          Toggle theme ({theme})
        </button>
        <span>·</span>
        <button onClick={() => setDir((d) => (d === 'ltr' ? 'rtl' : 'ltr'))} className="underline">
          Toggle dir ({dir})
        </button>
      </div>

      <Header
        dir={dir}
        tokens={tokens}
        brandName="Bitelyx"
        logoUrl={PLACEHOLDER_LOGO}
        cartCount={cartCount}
        cartLabel="Cart"
        menuLabel="Menu"
        isMobileOpen={mobileNavOpen}
        onToggleMobile={() => setMobileNavOpen((o) => !o)}
        onCartOpen={() => setCartOpen(true)}
        languageLabel="EN"
        onLanguageClick={() => {}}
        bannerText="🟢 Open now · Today: 11:00 — 23:00"
        bannerVariant="success"
        links={[
          { label: 'Menu', href: '#menu', active: true },
          { label: 'About', href: '#about' },
          { label: 'Contact', href: '#contact' },
        ]}
      />

      <Hero
        dir={dir}
        tokens={tokens}
        logoUrl={PLACEHOLDER_LOGO}
        brandName="Bitelyx"
        subtitle="Asian Street Food"
        trustLine="Trusted by thousands of happy customers"
        ctaMenuLabel="View Menu"
        ctaMenuHref="#menu"
        ctaWhatsappLabel="Order on WhatsApp"
        ctaWhatsappHref="https://wa.me/000"
        ctaGroupLabel="Group Order"
        ctaGroupHref="#group"
        slides={heroSlides}
      />

      <CategoryCards
        dir={dir}
        tokens={tokens}
        title="Browse Categories"
        items={categoryCardItems}
      />

      <BestSellers
        dir={dir}
        tokens={tokens}
        title="Best Sellers"
        items={bestSellerItems}
        quickAddLabel="Quick add"
        onOpen={() => {}}
        onQuickAdd={handleQuickAdd}
      />

      <div id="menu">
        <MenuSection
          dir={dir}
          tokens={tokens}
          categories={menuGroups}
          activeCategoryId={activeCategory}
          viewAllLabel="View All →"
          quickAddLabel="Quick add"
          onSelectCategory={setActiveCategory}
          onOpenItem={() => {}}
          onQuickAdd={handleQuickAdd}
        />
      </div>

      <PlattersPreview
        dir={dir}
        tokens={tokens}
        title="Platters"
        description="Perfect for sharing with friends and family."
        viewAllLabel="View All →"
        viewAllHref="#category-platters"
        items={platterItems}
        quickAddLabel="Quick add"
        onOpen={() => {}}
        onQuickAdd={handleQuickAdd}
      />

      <MeetChef
        dir={dir}
        tokens={tokens}
        eyebrow="Meet our chef"
        name="Chef Alex Morgan"
        bio="Trained across Tokyo, Bangkok and New York, Chef Alex brings street-food authenticity to every plate."
        imageUrl={PLACEHOLDER_CHEF}
      />

      <WhyOrderSection
        dir={dir}
        tokens={tokens}
        title="Why Order From Us"
        features={whyFeatures}
      />

      <WhatsAppCTA
        dir={dir}
        tokens={tokens}
        title="Hungry? Tap to order."
        description="Skip the queue — message us directly and we'll start cooking."
        buttonLabel="Order on WhatsApp"
        buttonHref="https://wa.me/000"
        backgroundImageUrl={PLACEHOLDER_PLATTER}
      />

      <Footer
        dir={dir}
        tokens={tokens}
        brandName="Bitelyx"
        brandTagline="Asian Street Food"
        logoUrl={PLACEHOLDER_LOGO}
        contactTitle="Contact"
        phoneLabel="000-000-0000"
        phoneHref="tel:+10000000000"
        addressLabel="123 Demo Street"
        hoursTitle="Hours"
        hoursLines={['Sun–Thu: 11:00–23:00', 'Fri: 11:00–15:00', 'Sat: Closed']}
        socials={[
          { label: 'Instagram', href: '#', iconUrl: PLACEHOLDER_IG },
          { label: 'WhatsApp', href: '#', iconUrl: PLACEHOLDER_WA },
        ]}
        copyright={`© ${new Date().getFullYear()} Bitelyx. All rights reserved.`}
        poweredBy="Powered by BITELYX"
      />

      <FloatingCart
        dir={dir}
        tokens={tokens}
        cartCount={cartCount}
        subtotal={subtotal}
        currencySymbol="$"
        label="View Cart"
        onClick={() => setCartOpen(true)}
      />

      <CartDrawer
        dir={dir}
        tokens={tokens}
        isOpen={cartOpen}
        title="Your Cart"
        itemsCountLabel={`${cartCount} item${cartCount === 1 ? '' : 's'}`}
        emptyTitle="Your cart is empty"
        emptyDescription="Add some delicious items to get started."
        subtotalLabel="Subtotal"
        checkoutLabel="Checkout"
        clearLabel="Clear Cart"
        closeLabel="Close cart"
        editLabel="Edit item"
        removeLabel="Remove item"
        decreaseLabel="Decrease quantity"
        increaseLabel="Increase quantity"
        currencySymbol="$"
        items={cartItems}
        subtotal={subtotal}
        onClose={() => setCartOpen(false)}
        onClear={() => setCartItems([])}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onRemove={handleRemove}
        onEdit={() => {}}
        onCheckout={() => setCartOpen(false)}
      />
    </div>
  );
};

export default DemoPage;