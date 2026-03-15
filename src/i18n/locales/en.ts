const en = {
  dir: 'ltr' as const,
  lang: 'en',
  label: 'EN',

  // Header
  header: {
    menu: 'Menu',
    about: 'About',
    contact: 'Contact',
  },

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

  // Chef
  chef: {
    title: 'Meet Our Chef',
    name: 'Chef Fouzy Khoury',
    bio: 'Chef Fouzy Khoury brings years of culinary experience and a passion for high-quality ingredients. With dedication to flavor, precision, and creativity, he leads the kitchen with a strong commitment to quality and memorable dining experiences.',
  },

  // Footer
  footer: {
    contact: 'Contact',
    address: 'Kfar Yassif',
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

  // About page
  about: {
    title: 'Our Story',
    p1: 'Pandalina was born from a passion for authentic Asian street food and the art of sushi. We bring the vibrant energy of Asian night markets to your neighborhood.',
    p2: 'Every roll is handcrafted with the freshest ingredients, every noodle bowl is made to order, and every dish is prepared with love and precision.',
    p3: 'From our signature sushi platters to our build-your-own noodle bowls, we offer an experience that is bold, fresh, and unforgettable.',
    values_title: 'What We Stand For',
    val1_title: 'Quality First',
    val1_desc: 'Premium fish and produce sourced daily from trusted suppliers.',
    val2_title: 'Speed & Freshness',
    val2_desc: 'Every order is made fresh. Fast takeaway without compromising quality.',
    val3_title: 'Asian Street Culture',
    val3_desc: 'We bring the energy, flavors, and spirit of Asian street food to every plate.',
  },

  // Contact page
  contact: {
    title: 'Get in Touch',
    name_label: 'Name',
    email_label: 'Email',
    message_label: 'Message',
    send: 'Send Message',
    phone_title: 'Phone / WhatsApp',
    location_title: 'Location',
    location_desc: 'Address coming soon',
    hours_title: 'Opening Hours',
  },
};

export default en;
export type Translations = Omit<typeof en, 'dir'> & { dir: 'ltr' | 'rtl' };
