const en = {
  dir: 'ltr' as const,
  lang: 'en',
  label: 'EN',

  // Hero
  hero: {
    title: 'Pandalina',
    subtitle: 'Asian Street Bar',
    tagline: 'Fresh Sushi • Asian Street Food • Fast Takeaway',
    cta_menu: 'View Menu',
    cta_whatsapp: 'Order on WhatsApp',
    slide2_title: 'Freshly Crafted Rolls',
    slide2_tagline: 'Made to order with premium ingredients',
    slide3_title: 'Asian Street Flavors',
    slide3_tagline: 'Noodles, bao, and more',
  },

  // Categories
  categories: {
    title: 'Popular Categories',
    'sushi-rolls': 'Sushi Rolls',
    kitchen: 'Kitchen',
    noodles: 'Noodles',
    platters: 'Platters',
  },

  // Menu
  menu: {
    best_sellers: 'Best Sellers',
    best_seller_badge: '⭐ Best Seller',
    premium_badge: '🔥 Perfect for Sharing',
    family_badge: '👨‍👩‍👧‍👦 Family Favorite',
    popular_badge: '⭐ Most Ordered',
    pieces: 'pieces',
  },

  // Product modal
  product: {
    extras: 'Extras',
    special_notes: 'Special Notes',
    notes_placeholder: 'Any special requests...',
    add_to_cart: 'Add to Cart',
    also_order: 'Customers Also Order',
    quick_add: 'Add',
  },

  // Noodle builder
  noodle: {
    title: 'Build Your Bowl',
    step_of: 'Step {{current}} of {{total}}',
    base: 'Base',
    toppings: 'Toppings',
    sauce: 'Sauce',
    next: 'Next',
    add_to_cart: 'Add to Cart',
    name: 'Build Your Noodle Bowl',
    description: 'Choose your base, toppings, and sauce',
    custom_name: 'Custom Noodle Bowl',
  },

  // Cart
  cart: {
    title: 'Your Cart',
    items_count: '({{count}} items)',
    empty_title: 'Your cart is empty',
    empty_desc: 'Add some delicious items!',
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    view_cart: 'View Cart',
    you_may_like: 'You May Also Like',
  },

  // Checkout
  checkout: {
    title: 'Complete Your Order',
    order_type: 'Order Type',
    pickup: 'Pickup',
    delivery: 'Delivery',
    eat_in: 'Eat In',
    name_placeholder: 'Your name',
    phone_placeholder: 'Phone number',
    address_placeholder: 'Delivery address',
    notes_placeholder: 'Additional notes (optional)',
    delivery_fee: 'Delivery Fee',
    total: 'Total',
    send_whatsapp: 'Send Order to WhatsApp',
  },

  // Why section
  why: {
    title: 'Why Pandalina',
    fresh_title: 'Fresh Ingredients',
    fresh_desc: 'Quality fish & produce daily',
    fast_title: 'Fast Takeaway',
    fast_desc: 'Ready in 20–30 minutes',
    street_title: 'Street Food Vibes',
    street_desc: 'Authentic Asian flavors',
    sharing_title: 'Sharing Platters',
    sharing_desc: 'Perfect for groups & parties',
  },

  // WhatsApp CTA
  cta: {
    title: 'Ready to Order?',
    desc: "Send your order directly on WhatsApp and we'll have it ready for you.",
    button: 'Order on WhatsApp',
  },

  // Footer
  footer: {
    contact: 'Contact',
    address: 'Address coming soon',
    hours_title: 'Opening Hours',
    hours_sun_thu: 'Sun–Thu: 11:00–23:00',
    hours_fri: 'Fri: 11:00–15:00',
    hours_sat: 'Sat: 20:00–23:00',
    copyright: '© {{year}} Pandalina — Asian Street Bar. All rights reserved.',
  },

  // WhatsApp message
  wa: {
    new_order: '🐼 New Order — Pandalina',
    customer: 'Customer',
    phone: 'Phone',
    order_type: 'Order Type',
    address: 'Address',
    items: 'Items',
    subtotal: 'Subtotal',
    delivery_fee: 'Delivery Fee',
    total: 'Total',
    notes: 'Notes',
    pickup: 'Pickup',
    delivery: 'Delivery',
    eat_in: 'Eat In',
  },
};

export default en;
export type Translations = typeof en;
