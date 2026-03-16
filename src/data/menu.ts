import type { MenuCategory, MenuItem } from '@/types/menu';

import sushiRoll1 from '@/assets/sushi-roll-1.jpg';
import sushiRoll2 from '@/assets/sushi-roll-2.jpg';
import sushiRoll3 from '@/assets/sushi-roll-3.jpg';
import noodlesImg from '@/assets/noodles.jpg';
import kitchen1 from '@/assets/kitchen-1.jpg';
import kitchen2 from '@/assets/kitchen-2.jpg';
import kitchen3 from '@/assets/kitchen-3.jpg';
import platterImg from '@/assets/platter.jpg';

const rollImages = [sushiRoll1, sushiRoll2, sushiRoll3];
const pickRollImg = (i: number) => rollImages[i % rollImages.length];

export const categories: MenuCategory[] = [
  { id: 'sushi-rolls', name: 'Sushi Rolls', name_he: 'רולים', name_ar: 'لفائف السوشي', slug: 'sushi-rolls', description: 'Signature sushi rolls', description_he: 'רולים מיוחדים של השף', description_ar: 'لفائف السوشي المميزة', image: sushiRoll1, sortOrder: 1 },
  { id: 'platters', name: 'Platters', name_he: 'מגשים', name_ar: 'أطباق للمشاركة', slug: 'platters', description: 'Sharing trays & party platters', description_he: 'מגשים למסיבות ואירועים', description_ar: 'صواني مشاركة وأطباق حفلات', image: platterImg, sortOrder: 2 },
  { id: 'kitchen', name: 'Kitchen', name_he: 'מטבח', name_ar: 'المطبخ', slug: 'kitchen', description: 'Hot dishes & specials', description_he: 'מנות חמות ומיוחדות', description_ar: 'أطباق ساخنة ومميزة', image: kitchen1, sortOrder: 3 },
  { id: 'noodles', name: 'Noodles', name_he: 'נודלס', name_ar: 'نودلز', slug: 'noodles', description: 'Build your own noodle bowl', description_he: 'בנו את קערת הנודלס שלכם', description_ar: 'ابنِ وعاء النودلز الخاص بك', image: noodlesImg, sortOrder: 4 },
];

/* ── Sushi roll translations ── */
const sushiRollsData: { name: string; name_he: string; name_ar: string }[] = [
  { name: 'Crunchy Roll', name_he: 'קראנצ׳י רול', name_ar: 'كرانشي رول' },
  { name: 'Sumo Roll', name_he: 'סומו רול', name_ar: 'سومو رول' },
  { name: 'Hulk Roll', name_he: 'האלק רול', name_ar: 'هالك رول' },
  { name: 'Volcano Roll', name_he: 'וולקנו רול', name_ar: 'فولكانو رول' },
  { name: 'King Kong Roll', name_he: 'קינג קונג רול', name_ar: 'كينغ كونغ رول' },
  { name: 'Kung Fu Panda Roll', name_he: 'קונג פו פנדה רול', name_ar: 'كونغ فو باندا رول' },
  { name: 'Ninja Roll', name_he: 'נינג׳ה רול', name_ar: 'نينجا رول' },
  { name: 'Godzilla Roll', name_he: 'גודזילה רול', name_ar: 'غودزيلا رول' },
  { name: 'Louis Vuitton', name_he: 'לואי ויטון', name_ar: 'لوي فيتون' },
  { name: 'Dragon Roll', name_he: 'דרגון רול', name_ar: 'دراغون رول' },
  { name: 'Double Salmon Roll', name_he: 'דאבל סלמון רול', name_ar: 'دبل سالمون رول' },
  { name: 'Spider Roll', name_he: 'ספיידר רול', name_ar: 'سبايدر رول' },
  { name: 'Buddha Roll', name_he: 'בודהה רול', name_ar: 'بودا رول' },
  { name: 'Mr. Orange Roll', name_he: 'מיסטר אורנג׳ רול', name_ar: 'مستر أورانج رول' },
  { name: 'Tony', name_he: 'טוני', name_ar: 'توني' },
  { name: 'Tony-S', name_he: 'טוני-S', name_ar: 'توني-S' },
];

const sushiExtras = [
  { id: 'extra-ginger', name: 'Extra Ginger', name_he: "ג'ינג'ר נוסף", name_ar: 'زنجبيل إضافي', priceModifier: 3 },
  { id: 'extra-wasabi', name: 'Extra Wasabi', name_he: 'וואסבי נוסף', name_ar: 'واسابي إضافي', priceModifier: 3 },
  { id: 'spicy-mayo', name: 'Spicy Mayo', name_he: 'מיונז חריף', name_ar: 'مايونيز حار', priceModifier: 4 },
  { id: 'soy-sauce', name: 'Soy Sauce', name_he: 'רוטב סויה', name_ar: 'صلصة الصويا', priceModifier: 0 },
];

const sushiRolls: MenuItem[] = sushiRollsData.map((roll, i) => ({
  id: `sushi-${i + 1}`,
  name: roll.name,
  name_he: roll.name_he,
  name_ar: roll.name_ar,
  slug: roll.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'sushi-rolls',
  description: 'Fresh handcrafted roll with premium ingredients',
  description_he: 'רול טרי בעבודת יד עם מרכיבים משובחים',
  description_ar: 'لفافة طازجة مصنوعة يدوياً بمكونات فاخرة',
  price: 42,
  image: pickRollImg(i),
  tags: ['sushi', 'roll'],
  isAvailable: true,
  isCustomizable: true,
  options: [
    {
      id: 'extras',
      title: 'Extras',
      title_he: 'תוספות',
      title_ar: 'إضافات',
      type: 'multiple' as const,
      required: false,
      choices: sushiExtras,
    },
  ],
  isFeatured: i < 4,
  sortOrder: i + 1,
}));

const kitchenData = [
  { name: 'Asadoaki', name_he: 'אסאדואקי', name_ar: 'أسادواكي', desc: 'Grilled beef with Asian glaze', desc_he: 'בקר צלוי עם זיגוג אסייתי', desc_ar: 'لحم بقري مشوي مع تزجيج آسيوي', price: 52, img: kitchen2 },
  { name: 'Crispy Salmon', name_he: 'סלמון קריספי', name_ar: 'سالمون مقرمش', desc: 'Pan-seared crispy skin salmon', desc_he: 'סלמון עם עור פריך על המחבת', desc_ar: 'سالمون بقشرة مقرمشة', price: 58, img: kitchen2 },
  { name: 'Avocado Salad', name_he: 'סלט אבוקדו', name_ar: 'سلطة أفوكادو', desc: 'Fresh avocado with sesame dressing', desc_he: 'אבוקדו טרי עם רוטב שומשום', desc_ar: 'أفوكادو طازج مع صلصة السمسم', price: 38, img: kitchen2 },
  { name: 'Beef Broccoli', name_he: 'בקר וברוקולי', name_ar: 'لحم بقري مع بروكلي', desc: 'Wok-tossed beef with broccoli', desc_he: 'בקר מוקפץ בווק עם ברוקולי', desc_ar: 'لحم بقري مقلي مع بروكلي', price: 48, img: kitchen2 },
  { name: 'Egg Roll', name_he: 'אגרול', name_ar: 'لفائف البيض', desc: 'Crispy golden egg rolls', desc_he: 'אגרולים פריכים ומוזהבים', desc_ar: 'لفائف بيض ذهبية مقرمشة', price: 28, img: kitchen1 },
  { name: 'Crispy Shrimp Tempura', name_he: 'טמפורה שרימפס', name_ar: 'تمبورا الروبيان المقرمشة', desc: 'Lightly battered tempura shrimp', desc_he: 'שרימפס טמפורה קלה ופריכה', desc_ar: 'روبيان تمبورا خفيف ومقرمش', price: 45, img: kitchen1 },
  { name: 'Chicken Popcorn', name_he: 'פופקורן עוף', name_ar: 'فشار الدجاج', desc: 'Bite-sized crispy chicken', desc_he: 'חתיכות עוף פריכות בגודל ביס', desc_ar: 'قطع دجاج مقرمشة بحجم القضمة', price: 35, img: kitchen1 },
  { name: 'Chicken Bao', name_he: "באו צ'יקן", name_ar: 'باو الدجاج', desc: 'Steamed bao with teriyaki chicken', desc_he: 'באו מאודה עם עוף טריאקי', desc_ar: 'باو مطهو على البخار مع دجاج ترياكي', price: 32, img: kitchen3 },
  { name: 'Salmon Teriyaki', name_he: 'סלמון טריאקי', name_ar: 'سالمون ترياكي', desc: 'Grilled salmon with teriyaki glaze', desc_he: 'סלמון צלוי עם זיגוג טריאקי', desc_ar: 'سالمون مشوي مع تزجيج ترياكي', price: 56, img: kitchen2 },
];

const kitchenItems: MenuItem[] = kitchenData.map((item, i) => ({
  id: `kitchen-${i + 1}`,
  name: item.name,
  name_he: item.name_he,
  name_ar: item.name_ar,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'kitchen',
  description: item.desc,
  description_he: item.desc_he,
  description_ar: item.desc_ar,
  price: item.price,
  image: item.img,
  tags: ['kitchen'],
  isAvailable: true,
  isCustomizable: false,
  options: [],
  isFeatured: i < 3,
  sortOrder: i + 1,
}));

const noodleItem: MenuItem = {
  id: 'noodle-bowl',
  name: 'Build Your Noodle Bowl',
  name_he: 'בנו את קערת הנודלס',
  name_ar: 'ابنِ وعاء النودلز',
  slug: 'build-your-noodle-bowl',
  categoryId: 'noodles',
  description: 'Choose your base, toppings, and sauce',
  description_he: 'בחרו בסיס, תוספות ורוטב',
  description_ar: 'اختر القاعدة والإضافات والصلصة',
  price: 38,
  image: noodlesImg,
  tags: ['noodles', 'customizable'],
  isAvailable: true,
  isCustomizable: true,
  options: [],
  isFeatured: true,
  sortOrder: 1,
};

export const noodleBases = [
  { id: 'egg-noodles', name: 'Egg Noodles', name_he: 'נודלס ביצים', name_ar: 'نودلز البيض', priceModifier: 0 },
  { id: 'rice-noodles', name: 'Rice Noodles', name_he: 'נודלס אורז', name_ar: 'نودلز الأرز', priceModifier: 0 },
  { id: 'udon', name: 'Udon Noodles', name_he: 'נודלס אודון', name_ar: 'نودلز أودون', priceModifier: 0 },
  { id: 'soba', name: 'Soba Noodles', name_he: 'נודלס סובה', name_ar: 'نودلز سوبا', priceModifier: 0 },
  { id: 'white-rice', name: 'White Rice', name_he: 'אורז לבן', name_ar: 'أرز أبيض', priceModifier: 0 },
];

export const noodleToppings = [
  { id: 'chicken', name: 'Chicken', name_he: 'עוף', name_ar: 'دجاج', priceModifier: 8 },
  { id: 'beef', name: 'Beef', name_he: 'בקר', name_ar: 'لحم بقري', priceModifier: 12 },
  { id: 'shrimp', name: 'Shrimp', name_he: 'שרימפס', name_ar: 'روبيان', priceModifier: 14 },
  { id: 'salmon', name: 'Salmon', name_he: 'סלמון', name_ar: 'سالمون', priceModifier: 16 },
  { id: 'egg', name: 'Egg', name_he: 'ביצה', name_ar: 'بيض', priceModifier: 4 },
  { id: 'broccoli', name: 'Broccoli', name_he: 'ברוקולי', name_ar: 'بروكلي', priceModifier: 3 },
  { id: 'onion', name: 'Onion', name_he: 'בצל', name_ar: 'بصل', priceModifier: 2 },
  { id: 'bean-sprouts', name: 'Bean Sprouts', name_he: 'נבטים', name_ar: 'براعم الفاصولياء', priceModifier: 2 },
  { id: 'pineapple', name: 'Pineapple', name_he: 'אננס', name_ar: 'أناناس', priceModifier: 3 },
  { id: 'jalapeno', name: 'Jalapeño', name_he: "חלפיניו", name_ar: 'هالابينو', priceModifier: 2 },
  { id: 'sesame', name: 'Sesame', name_he: 'שומשום', name_ar: 'سمسم', priceModifier: 1 },
  { id: 'peanuts', name: 'Peanuts', name_he: 'בוטנים', name_ar: 'فول سوداني', priceModifier: 2 },
  { id: 'cashew', name: 'Cashew', name_he: 'קשיו', name_ar: 'كاجو', priceModifier: 3 },
];

export const noodleSauces = [
  { id: 'pandalina', name: 'Pandalina', name_he: 'פנדלינה', name_ar: 'باندالينا', priceModifier: 0 },
  { id: 'tokyo', name: 'Tokyo', name_he: 'טוקיו', name_ar: 'طوكيو', priceModifier: 0 },
  { id: 'shanghai', name: 'Shanghai', name_he: 'שנגחאי', name_ar: 'شنغهاي', priceModifier: 0 },
  { id: 'bangkok', name: 'Bangkok', name_he: 'בנגקוק', name_ar: 'بانكوك', priceModifier: 0 },
  { id: 'jakarta', name: 'Jakarta', name_he: 'ג׳קרטה', name_ar: 'جاكرتا', priceModifier: 0 },
  { id: 'hanoi', name: 'Hanoi', name_he: 'האנוי', name_ar: 'هانوي', priceModifier: 0 },
  { id: 'hong-kong', name: 'Hong Kong', name_he: 'הונג קונג', name_ar: 'هونغ كونغ', priceModifier: 0 },
  { id: 'manila', name: 'Manila', name_he: 'מנילה', name_ar: 'مانيلا', priceModifier: 0 },
];

const plattersData = [
  { name: 'Family Sushi Platter', name_he: 'מגש סושי משפחתי', name_ar: 'طبق سوشي عائلي', desc: '48 pieces of mixed sushi rolls — Perfect for sharing', desc_he: '48 חתיכות רולים מעורבים — מושלם לשיתוף', desc_ar: '48 قطعة من لفائف السوشي المتنوعة — مثالي للمشاركة', price: 199, badge: 'family' },
  { name: 'Party Sushi Tray', name_he: 'מגש סושי למסיבה', name_ar: 'صينية سوشي للحفلات', desc: '72 pieces assorted sushi — Chef selection', desc_he: '72 חתיכות סושי מגוון — בחירת השף', desc_ar: '72 قطعة سوشي متنوعة — اختيار الشيف', price: 289, badge: 'popular' },
  { name: 'Premium Sushi Combo', name_he: 'קומבו סושי פרימיום', name_ar: 'كومبو سوشي مميز', desc: '60 pieces of signature rolls', desc_he: '60 חתיכות של רולים ייחודיים', desc_ar: '60 قطعة من اللفائف المميزة', price: 249, badge: 'premium' },
  { name: 'Large Sushi Celebration Tray', name_he: 'מגש סושי חגיגי גדול', name_ar: 'صينية سوشي احتفالية كبيرة', desc: '96 pieces of mixed sushi — Perfect for events', desc_he: '96 חתיכות סושי מעורב — מושלם לאירועים', desc_ar: '96 قطعة سوشي متنوعة — مثالية للمناسبات', price: 379, badge: 'premium' },
  { name: 'Pandalina Party Platter', name_he: 'מגש מסיבה פנדלינה', name_ar: 'طبق حفلة باندالينا', desc: '40 pieces of mixed sushi rolls', desc_he: '40 חתיכות רולים מעורבים', desc_ar: '40 قطعة من لفائف السوشي المتنوعة', price: 189, badge: 'popular' },
  { name: 'Date Night Box', name_he: 'קופסת ערב רומנטי', name_ar: 'علبة ليلة رومانسية', desc: '16 premium pieces for two', desc_he: '16 חתיכות פרימיום לזוג', desc_ar: '16 قطعة فاخرة لشخصين', price: 99, badge: 'family' },
];

const platters: MenuItem[] = plattersData.map((item, i) => ({
  id: `platter-${i + 1}`,
  name: item.name,
  name_he: item.name_he,
  name_ar: item.name_ar,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'platters',
  description: item.desc,
  description_he: item.desc_he,
  description_ar: item.desc_ar,
  price: item.price,
  image: platterImg,
  tags: ['platter', 'sharing'],
  isAvailable: true,
  isCustomizable: false,
  options: [],
  isFeatured: i < 2,
  sortOrder: i + 1,
}));

export const menuItems: MenuItem[] = [
  ...sushiRolls,
  ...kitchenItems,
  noodleItem,
  ...platters,
];

export const featuredItems = menuItems.filter(item => item.isFeatured);

export const getItemsByCategory = (categoryId: string) =>
  menuItems.filter(item => item.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
