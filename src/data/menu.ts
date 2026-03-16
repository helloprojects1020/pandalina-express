import type { MenuCategory, MenuItem } from '@/types/menu';

import sushiRoll1 from '@/assets/sushi-roll-1.jpg';
import sushiRoll2 from '@/assets/sushi-roll-2.jpg';
import sushiRoll3 from '@/assets/sushi-roll-3.jpg';
import noodlesImg from '@/assets/noodles.jpg';
import noodleChickenTeriyaki from '@/assets/noodle-chicken-teriyaki.jpg';
import noodleSpicyBeef from '@/assets/noodle-spicy-beef.jpg';
import noodleShrimpPadthai from '@/assets/noodle-shrimp-padthai.jpg';
import noodleVeggieLomein from '@/assets/noodle-veggie-lomein.jpg';
import kitchenAsadoaki from '@/assets/kitchen-asadoaki.jpg';
import kitchenCrispySalmon from '@/assets/kitchen-crispy-salmon.jpg';
import kitchenAvocadoSalad from '@/assets/kitchen-avocado-salad.jpg';
import kitchenBeefBroccoli from '@/assets/kitchen-beef-broccoli.jpg';
import kitchenEggRoll from '@/assets/kitchen-egg-roll.jpg';
import kitchenShrimpTempura from '@/assets/kitchen-shrimp-tempura.jpg';
import kitchenChickenPopcorn from '@/assets/kitchen-chicken-popcorn.jpg';
import kitchenChickenBao from '@/assets/kitchen-chicken-bao.jpg';
import kitchenSalmonTeriyaki from '@/assets/kitchen-salmon-teriyaki.jpg';
import platterImg from '@/assets/platter.jpg';
import platterFamily from '@/assets/platter-family.jpg';
import platterParty from '@/assets/platter-party.jpg';
import platterPremium from '@/assets/platter-premium.jpg';
import platterCelebration from '@/assets/platter-celebration.jpg';
import platterPandalina from '@/assets/platter-pandalina.jpg';
import platterDateNight from '@/assets/platter-date-night.jpg';
import drinksCategoryImg from '@/assets/drinks-category.jpg';
import drinkColaImg from '@/assets/drink-cola.jpg';
import drinkSpriteImg from '@/assets/drink-sprite.jpg';
import drinkFantaImg from '@/assets/drink-fanta.jpg';
import drinkWaterImg from '@/assets/drink-water.jpg';
import drinkIcedTeaImg from '@/assets/drink-icedtea.jpg';
import drinkGoldstarImg from '@/assets/drink-goldstar.jpg';
import drinkHeinekenImg from '@/assets/drink-heineken.jpg';
import drinkCoronaImg from '@/assets/drink-corona.jpg';
import drinkAsahiImg from '@/assets/drink-asahi.jpg';
import drinkRedWineImg from '@/assets/drink-red-wine.jpg';
import drinkWhiteWineImg from '@/assets/drink-white-wine.jpg';
import drinkRoseWineImg from '@/assets/drink-rose-wine.jpg';

const rollImages = [sushiRoll1, sushiRoll2, sushiRoll3];
const pickRollImg = (i: number) => rollImages[i % rollImages.length];

export const categories: MenuCategory[] = [
  { id: 'sushi-rolls', name: 'Sushi Rolls', name_he: 'רולים', name_ar: 'لفائف السوشي', name_ru: 'Роллы', slug: 'sushi-rolls', description: 'Signature sushi rolls', description_he: 'רולים מיוחדים של השף', description_ar: 'لفائف السوشي المميزة', description_ru: 'Фирменные суши-роллы', image: sushiRoll1, sortOrder: 1 },
  { id: 'platters', name: 'Platters', name_he: 'מגשים', name_ar: 'أطباق للمشاركة', name_ru: 'Сеты', slug: 'platters', description: 'Sharing trays & party platters', description_he: 'מגשים למסיבות ואירועים', description_ar: 'صواني مشاركة وأطباق حفلات', description_ru: 'Сеты для компании и вечеринок', image: platterFamily, sortOrder: 2 },
  { id: 'kitchen', name: 'Kitchen', name_he: 'מטבח', name_ar: 'المطبخ', name_ru: 'Кухня', slug: 'kitchen', description: 'Hot dishes & specials', description_he: 'מנות חמות ומיוחדות', description_ar: 'أطباق ساخنة ومميزة', description_ru: 'Горячие блюда и спецпредложения', image: kitchenAsadoaki, sortOrder: 3 },
  { id: 'noodles', name: 'Noodles', name_he: 'נודלס', name_ar: 'نودلز', name_ru: 'Лапша', slug: 'noodles', description: 'Build your own noodle bowl', description_he: 'בנו את קערת הנודלס שלכם', description_ar: 'ابنِ وعاء النودلز الخاص بك', description_ru: 'Собери свою миску лапши', image: noodlesImg, sortOrder: 4 },
  { id: 'drinks', name: 'Drinks', name_he: 'שתייה', name_ar: 'مشروبات', name_ru: 'Напитки', slug: 'drinks', description: 'Soft drinks, beer & wine', description_he: 'שתייה קלה, בירה ויין', description_ar: 'مشروبات غازية، بيرة ونبيذ', description_ru: 'Безалкогольные, пиво и вино', image: drinksCategoryImg, sortOrder: 5 },
];

/* ── Sushi roll translations ── */
const sushiRollsData: { name: string; name_he: string; name_ar: string; name_ru: string }[] = [
  { name: 'Crunchy Roll', name_he: 'קראנצ׳י רול', name_ar: 'كرانشي رول', name_ru: 'Кранчи ролл' },
  { name: 'Sumo Roll', name_he: 'סומו רול', name_ar: 'سومو رول', name_ru: 'Сумо ролл' },
  { name: 'Hulk Roll', name_he: 'האלק רול', name_ar: 'هالك رول', name_ru: 'Халк ролл' },
  { name: 'Volcano Roll', name_he: 'וולקנו רול', name_ar: 'فولكانو رول', name_ru: 'Вулкан ролл' },
  { name: 'King Kong Roll', name_he: 'קינג קונג רול', name_ar: 'كينغ كونغ رول', name_ru: 'Кинг Конг ролл' },
  { name: 'Kung Fu Panda Roll', name_he: 'קונג פו פנדה רול', name_ar: 'كونغ فو باندا رول', name_ru: 'Кунг-фу Панда ролл' },
  { name: 'Ninja Roll', name_he: 'נינג׳ה רול', name_ar: 'نينجا رول', name_ru: 'Ниндзя ролл' },
  { name: 'Godzilla Roll', name_he: 'גודזילה רול', name_ar: 'غودزيلا رول', name_ru: 'Годзилла ролл' },
  { name: 'Louis Vuitton', name_he: 'לואי ויטון', name_ar: 'لوي فيتون', name_ru: 'Луи Виттон' },
  { name: 'Dragon Roll', name_he: 'דרגון רול', name_ar: 'دراغون رول', name_ru: 'Дракон ролл' },
  { name: 'Double Salmon Roll', name_he: 'דאבל סלמון רול', name_ar: 'دبل سالمون رول', name_ru: 'Дабл Лосось ролл' },
  { name: 'Spider Roll', name_he: 'ספיידר רול', name_ar: 'سبايدر رول', name_ru: 'Спайдер ролл' },
  { name: 'Buddha Roll', name_he: 'בודהה רול', name_ar: 'بودا رول', name_ru: 'Будда ролл' },
  { name: 'Mr. Orange Roll', name_he: 'מיסטר אורנג׳ רול', name_ar: 'مستر أورانج رول', name_ru: 'Мистер Оранж ролл' },
  { name: 'Tony', name_he: 'טוני', name_ar: 'توني', name_ru: 'Тони' },
  { name: 'Tony-S', name_he: 'טוני-S', name_ar: 'توني-S', name_ru: 'Тони-S' },
];

const sushiExtras = [
  { id: 'extra-ginger', name: 'Extra Ginger', name_he: "ג'ינג'ר נוסף", name_ar: 'زنجبيل إضافي', name_ru: 'Доп. имбирь', priceModifier: 3 },
  { id: 'extra-wasabi', name: 'Extra Wasabi', name_he: 'וואסבי נוסף', name_ar: 'واسابي إضافي', name_ru: 'Доп. васаби', priceModifier: 3 },
  { id: 'spicy-mayo', name: 'Spicy Mayo', name_he: 'מיונז חריף', name_ar: 'مايونيز حار', name_ru: 'Острый майонез', priceModifier: 4 },
  { id: 'soy-sauce', name: 'Soy Sauce', name_he: 'רוטב סויה', name_ar: 'صلصة الصويا', name_ru: 'Соевый соус', priceModifier: 0 },
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
  { name: 'Asadoaki', name_he: 'אסאדואקי', name_ar: 'أسادواكي', desc: 'Grilled beef with Asian glaze', desc_he: 'בקר צלוי עם זיגוג אסייתי', desc_ar: 'لحم بقري مشوي مع تزجيج آسيوي', price: 52, img: kitchenAsadoaki },
  { name: 'Crispy Salmon', name_he: 'סלמון קריספי', name_ar: 'سالمون مقرمش', desc: 'Pan-seared crispy skin salmon', desc_he: 'סלמון עם עור פריך על המחבת', desc_ar: 'سالمون بقشرة مقرمشة', price: 58, img: kitchenCrispySalmon },
  { name: 'Avocado Salad', name_he: 'סלט אבוקדו', name_ar: 'سلطة أفوكادو', desc: 'Fresh avocado with sesame dressing', desc_he: 'אבוקדו טרי עם רוטב שומשום', desc_ar: 'أفوكادو طازج مع صلصة السمسم', price: 38, img: kitchenAvocadoSalad },
  { name: 'Beef Broccoli', name_he: 'בקר וברוקולי', name_ar: 'لحم بقري مع بروكلي', desc: 'Wok-tossed beef with broccoli', desc_he: 'בקר מוקפץ בווק עם ברוקולי', desc_ar: 'لحم بقري مقلي مع بروكلي', price: 48, img: kitchenBeefBroccoli },
  { name: 'Egg Roll', name_he: 'אגרול', name_ar: 'لفائف البيض', desc: 'Crispy golden egg rolls', desc_he: 'אגרולים פריכים ומוזהבים', desc_ar: 'لفائف بيض ذهبية مقرمشة', price: 28, img: kitchenEggRoll },
  { name: 'Crispy Shrimp Tempura', name_he: 'טמפורה שרימפס', name_ar: 'تمبورا الروبيان المقرمشة', desc: 'Lightly battered tempura shrimp', desc_he: 'שרימפס טמפורה קלה ופריכה', desc_ar: 'روبيان تمبورا خفيف ومقرمش', price: 45, img: kitchenShrimpTempura },
  { name: 'Chicken Popcorn', name_he: 'פופקורן עוף', name_ar: 'فشار الدجاج', desc: 'Bite-sized crispy chicken', desc_he: 'חתיכות עוף פריכות בגודל ביס', desc_ar: 'قطع دجاج مقرمشة بحجم القضمة', price: 35, img: kitchenChickenPopcorn },
  { name: 'Chicken Bao', name_he: "באו צ'יקן", name_ar: 'باو الدجاج', desc: 'Steamed bao with teriyaki chicken', desc_he: 'באו מאודה עם עוף טריאקי', desc_ar: 'باو مطهو على البخار مع دجاج ترياكي', price: 32, img: kitchenChickenBao },
  { name: 'Salmon Teriyaki', name_he: 'סלמון טריאקי', name_ar: 'سالمون ترياكي', desc: 'Grilled salmon with teriyaki glaze', desc_he: 'סלמון צלוי עם זיגוג טריאקי', desc_ar: 'سالمون مشوي مع تزجيج ترياكي', price: 56, img: kitchenSalmonTeriyaki },
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

const noodlesData = [
  { name: 'Build Your Noodle Bowl', name_he: 'בנו את קערת הנודלס', name_ar: 'ابنِ وعاء النودلز', desc: 'Choose your base, toppings, and sauce', desc_he: 'בחרו בסיס, תוספות ורוטב', desc_ar: 'اختر القاعدة والإضافات والصلصة', price: 38, img: noodlesImg, customizable: true },
  { name: 'Chicken Teriyaki Noodles', name_he: 'נודלס עוף טריאקי', name_ar: 'نودلز دجاج ترياكي', desc: 'Udon noodles with grilled teriyaki chicken', desc_he: 'נודלס אודון עם עוף טריאקי צלוי', desc_ar: 'نودلز أودون مع دجاج ترياكي مشوي', price: 46, img: noodleChickenTeriyaki, customizable: false },
  { name: 'Spicy Beef Ramen', name_he: 'ראמן בקר חריף', name_ar: 'رامن لحم بقري حار', desc: 'Rich spicy broth with sliced beef & soft egg', desc_he: 'מרק חריף עשיר עם בקר פרוס וביצה רכה', desc_ar: 'مرق حار غني مع شرائح لحم بقري وبيض طري', price: 52, img: noodleSpicyBeef, customizable: false },
  { name: 'Shrimp Pad Thai', name_he: 'פאד תאי שרימפס', name_ar: 'باد تاي روبيان', desc: 'Rice noodles with shrimp, peanuts & lime', desc_he: 'נודלס אורז עם שרימפס, בוטנים ולימון', desc_ar: 'نودلز أرز مع روبيان وفول سوداني وليمون', price: 48, img: noodleShrimpPadthai, customizable: false },
  { name: 'Veggie Lo Mein', name_he: 'לו מיין ירקות', name_ar: 'لو مين خضار', desc: 'Stir-fried egg noodles with seasonal vegetables', desc_he: 'נודלס ביצים מוקפצים עם ירקות עונתיים', desc_ar: 'نودلز البيض المقلية مع خضروات موسمية', price: 38, img: noodleVeggieLomein, customizable: false },
];

const noodleItems: MenuItem[] = noodlesData.map((item, i) => ({
  id: i === 0 ? 'noodle-bowl' : `noodle-${i + 1}`,
  name: item.name,
  name_he: item.name_he,
  name_ar: item.name_ar,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'noodles',
  description: item.desc,
  description_he: item.desc_he,
  description_ar: item.desc_ar,
  price: item.price,
  image: item.img,
  tags: ['noodles', ...(item.customizable ? ['customizable'] : [])],
  isAvailable: true,
  isCustomizable: item.customizable,
  options: [],
  isFeatured: i < 2,
  sortOrder: i + 1,
}));

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
  { name: 'Family Sushi Platter', name_he: 'מגש סושי משפחתי', name_ar: 'طبق سوشي عائلي', desc: '48 pieces of mixed sushi rolls — Perfect for sharing', desc_he: '48 חתיכות רולים מעורבים — מושלם לשיתוף', desc_ar: '48 قطعة من لفائف السوشي المتنوعة — مثالي للمشاركة', price: 199, badge: 'family', img: platterFamily },
  { name: 'Party Sushi Tray', name_he: 'מגש סושי למסיבה', name_ar: 'صينية سوشي للحفلات', desc: '72 pieces assorted sushi — Chef selection', desc_he: '72 חתיכות סושי מגוון — בחירת השף', desc_ar: '72 قطعة سوشي متنوعة — اختيار الشيف', price: 289, badge: 'popular', img: platterParty },
  { name: 'Premium Sushi Combo', name_he: 'קומבו סושי פרימיום', name_ar: 'كومبو سوشي مميز', desc: '60 pieces of signature rolls', desc_he: '60 חתיכות של רולים ייחודיים', desc_ar: '60 قطعة من اللفائف المميزة', price: 249, badge: 'premium', img: platterPremium },
  { name: 'Large Sushi Celebration Tray', name_he: 'מגש סושי חגיגי גדול', name_ar: 'صينية سوشي احتفالية كبيرة', desc: '96 pieces of mixed sushi — Perfect for events', desc_he: '96 חתיכות סושי מעורב — מושלם לאירועים', desc_ar: '96 قطعة سوشي متنوعة — مثالية للمناسبات', price: 379, badge: 'premium', img: platterCelebration },
  { name: 'Pandalina Party Platter', name_he: 'מגש מסיבה פנדלינה', name_ar: 'طبق حفلة باندالينا', desc: '40 pieces of mixed sushi rolls', desc_he: '40 חתיכות רולים מעורבים', desc_ar: '40 قطعة من لفائف السوشي المتنوعة', price: 189, badge: 'popular', img: platterPandalina },
  { name: 'Date Night Box', name_he: 'קופסת ערב רומנטי', name_ar: 'علبة ليلة رومانسية', desc: '16 premium pieces for two', desc_he: '16 חתיכות פרימיום לזוג', desc_ar: '16 قطعة فاخرة لشخصين', price: 99, badge: 'family', img: platterDateNight },
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
  image: item.img,
  tags: ['platter', 'sharing'],
  isAvailable: true,
  isCustomizable: false,
  options: [],
  isFeatured: i < 2,
  sortOrder: i + 1,
}));

/* ── Drinks ── */
const drinksData = [
  // Soft drinks
  { name: 'Coca Cola', name_he: 'קוקה קולה', name_ar: 'كوكا كولا', desc: 'Classic Coca Cola', desc_he: 'קוקה קולה קלאסית', desc_ar: 'كوكا كولا كلاسيكية', price: 12, tags: ['soft-drink'] },
  { name: 'Coca Cola Zero', name_he: 'קוקה קולה זירו', name_ar: 'كوكا كولا زيرو', desc: 'Zero sugar', desc_he: 'ללא סוכר', desc_ar: 'بدون سكر', price: 12, tags: ['soft-drink'] },
  { name: 'Sprite', name_he: 'ספרייט', name_ar: 'سبرايت', desc: 'Lemon-lime soda', desc_he: 'סודה בטעם לימון', desc_ar: 'مشروب غازي بنكهة الليمون', price: 12, tags: ['soft-drink'] },
  { name: 'Fanta', name_he: 'פנטה', name_ar: 'فانتا', desc: 'Orange soda', desc_he: 'סודה בטעם תפוז', desc_ar: 'مشروب غازي بنكهة البرتقال', price: 12, tags: ['soft-drink'] },
  { name: 'Sparkling Water', name_he: 'מים מוגזים', name_ar: 'مياه فوارة', desc: 'Sparkling mineral water', desc_he: 'מים מינרלים מוגזים', desc_ar: 'مياه معدنية فوارة', price: 10, tags: ['soft-drink'] },
  { name: 'Mineral Water', name_he: 'מים מינרלים', name_ar: 'مياه معدنية', desc: 'Still mineral water', desc_he: 'מים מינרלים שקטים', desc_ar: 'مياه معدنية ساكنة', price: 8, tags: ['soft-drink'] },
  { name: 'Fuse Tea', name_he: 'פיוז טי', name_ar: 'فيوز تي', desc: 'Iced tea', desc_he: 'תה קר', desc_ar: 'شاي مثلج', price: 12, tags: ['soft-drink'] },
  // Beer
  { name: 'Goldstar', name_he: 'גולדסטאר', name_ar: 'غولدستار', desc: 'Israeli lager', desc_he: 'לאגר ישראלי', desc_ar: 'بيرة إسرائيلية', price: 22, tags: ['beer'] },
  { name: 'Maccabi', name_he: 'מכבי', name_ar: 'مكابي', desc: 'Premium lager', desc_he: 'לאגר פרימיום', desc_ar: 'بيرة فاخرة', price: 22, tags: ['beer'] },
  { name: 'Heineken', name_he: 'הייניקן', name_ar: 'هاينكن', desc: 'Dutch premium lager', desc_he: 'לאגר הולנדי פרימיום', desc_ar: 'بيرة هولندية فاخرة', price: 25, tags: ['beer'] },
  { name: 'Corona', name_he: 'קורונה', name_ar: 'كورونا', desc: 'Mexican pale lager', desc_he: 'לאגר מקסיקני', desc_ar: 'بيرة مكسيكية', price: 25, tags: ['beer'] },
  { name: 'Asahi', name_he: 'אסאהי', name_ar: 'أساهي', desc: 'Japanese rice lager', desc_he: 'לאגר יפני', desc_ar: 'بيرة يابانية', price: 28, tags: ['beer'] },
  { name: 'Sapporo', name_he: 'סאפורו', name_ar: 'سابورو', desc: 'Premium Japanese beer', desc_he: 'בירה יפנית פרימיום', desc_ar: 'بيرة يابانية فاخرة', price: 28, tags: ['beer'] },
  // Wine
  { name: 'Red Wine (Glass)', name_he: 'יין אדום (כוס)', name_ar: 'نبيذ أحمر (كأس)', desc: 'House red wine glass', desc_he: 'כוס יין אדום של הבית', desc_ar: 'كأس نبيذ أحمر', price: 32, tags: ['wine'] },
  { name: 'Red Wine (Bottle)', name_he: 'יין אדום (בקבוק)', name_ar: 'نبيذ أحمر (زجاجة)', desc: 'House red wine bottle', desc_he: 'בקבוק יין אדום של הבית', desc_ar: 'زجاجة نبيذ أحمر', price: 110, tags: ['wine'] },
  { name: 'White Wine (Glass)', name_he: 'יין לבן (כוס)', name_ar: 'نبيذ أبيض (كأس)', desc: 'House white wine glass', desc_he: 'כוס יין לבן של הבית', desc_ar: 'كأس نبيذ أبيض', price: 32, tags: ['wine'] },
  { name: 'White Wine (Bottle)', name_he: 'יין לבן (בקבוק)', name_ar: 'نبيذ أبيض (زجاجة)', desc: 'House white wine bottle', desc_he: 'בקבוק יין לבן של הבית', desc_ar: 'زجاجة نبيذ أبيض', price: 110, tags: ['wine'] },
  { name: 'Rosé Wine (Glass)', name_he: 'יין רוזה (כוס)', name_ar: 'نبيذ وردي (كأس)', desc: 'House rosé wine glass', desc_he: 'כוס יין רוזה של הבית', desc_ar: 'كأس نبيذ وردي', price: 32, tags: ['wine'] },
  { name: 'Rosé Wine (Bottle)', name_he: 'יין רוזה (בקבוק)', name_ar: 'نبيذ وردي (زجاجة)', desc: 'House rosé wine bottle', desc_he: 'בקבוק יין רוזה של הבית', desc_ar: 'زجاجة نبيذ وردي', price: 110, tags: ['wine'] },
];

const drinkImageMap: Record<string, string> = {
  'Coca Cola': drinkColaImg,
  'Coca Cola Zero': drinkColaImg,
  'Sprite': drinkSpriteImg,
  'Fanta': drinkFantaImg,
  'Sparkling Water': drinkWaterImg,
  'Mineral Water': drinkWaterImg,
  'Fuse Tea': drinkIcedTeaImg,
  'Goldstar': drinkGoldstarImg,
  'Maccabi': drinkGoldstarImg,
  'Heineken': drinkHeinekenImg,
  'Corona': drinkCoronaImg,
  'Asahi': drinkAsahiImg,
  'Sapporo': drinkAsahiImg,
  'Red Wine (Glass)': drinkRedWineImg,
  'Red Wine (Bottle)': drinkRedWineImg,
  'White Wine (Glass)': drinkWhiteWineImg,
  'White Wine (Bottle)': drinkWhiteWineImg,
  'Rosé Wine (Glass)': drinkRoseWineImg,
  'Rosé Wine (Bottle)': drinkRoseWineImg,
};

const drinkItems: MenuItem[] = drinksData.map((item, i) => ({
  id: `drink-${i + 1}`,
  name: item.name,
  name_he: item.name_he,
  name_ar: item.name_ar,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'drinks',
  description: item.desc,
  description_he: item.desc_he,
  description_ar: item.desc_ar,
  price: item.price,
  image: drinkImageMap[item.name] || drinkColaImg,
  tags: ['drinks', ...item.tags],
  isAvailable: true,
  isCustomizable: false,
  options: [],
  isFeatured: false,
  sortOrder: i + 1,
}));

export const menuItems: MenuItem[] = [
  ...sushiRolls,
  ...kitchenItems,
  ...noodleItems,
  ...platters,
  ...drinkItems,
];

export const featuredItems = menuItems.filter(item => item.isFeatured);

export const getItemsByCategory = (categoryId: string) =>
  menuItems.filter(item => item.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
