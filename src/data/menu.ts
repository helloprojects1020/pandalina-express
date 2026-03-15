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
  { id: 'sushi-rolls', name: 'Sushi Rolls', slug: 'sushi-rolls', description: 'Signature sushi rolls', image: sushiRoll1, sortOrder: 1 },
  { id: 'kitchen', name: 'Kitchen', slug: 'kitchen', description: 'Hot dishes & specials', image: kitchen1, sortOrder: 2 },
  { id: 'noodles', name: 'Noodles', slug: 'noodles', description: 'Build your own noodle bowl', image: noodlesImg, sortOrder: 3 },
  { id: 'platters', name: 'Platters', slug: 'platters', description: 'Sharing trays & party platters', image: platterImg, sortOrder: 4 },
];

const sushiRolls: MenuItem[] = [
  'Crunchy Roll', 'Sumo Roll', 'Hulk Roll', 'Volcano Roll', 'King Kong Roll',
  'Kung Fu Panda Roll', 'Ninja Roll', 'Godzilla Roll', 'Louis Vuitton',
  'Dragon Roll', 'Double Salmon Roll', 'Spider Roll', 'Buddha Roll',
  'Mr. Orange Roll', 'Tony', 'Tony-S',
].map((name, i) => ({
  id: `sushi-${i + 1}`,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'sushi-rolls',
  description: 'Fresh handcrafted roll with premium ingredients',
  price: 42,
  image: pickRollImg(i),
  tags: ['sushi', 'roll'],
  isAvailable: true,
  isCustomizable: true,
  options: [
    {
      id: 'extras',
      title: 'Extras',
      type: 'multiple' as const,
      required: false,
      choices: [
        { id: 'extra-ginger', name: 'Extra Ginger', priceModifier: 3 },
        { id: 'extra-wasabi', name: 'Extra Wasabi', priceModifier: 3 },
        { id: 'spicy-mayo', name: 'Spicy Mayo', priceModifier: 4 },
        { id: 'soy-sauce', name: 'Soy Sauce', priceModifier: 0 },
      ],
    },
  ],
  isFeatured: i < 4,
  sortOrder: i + 1,
}));

const kitchenItems: MenuItem[] = [
  { name: 'Asadoaki', desc: 'Grilled beef with Asian glaze', price: 52, img: kitchen2 },
  { name: 'Crispy Salmon', desc: 'Pan-seared crispy skin salmon', price: 58, img: kitchen2 },
  { name: 'Avocado Salad', desc: 'Fresh avocado with sesame dressing', price: 38, img: kitchen2 },
  { name: 'Beef Broccoli', desc: 'Wok-tossed beef with broccoli', price: 48, img: kitchen2 },
  { name: 'Egg Roll', desc: 'Crispy golden egg rolls', price: 28, img: kitchen1 },
  { name: 'Crispy Shrimp Tempura', desc: 'Lightly battered tempura shrimp', price: 45, img: kitchen1 },
  { name: 'Chicken Popcorn', desc: 'Bite-sized crispy chicken', price: 35, img: kitchen1 },
  { name: 'Chicken Bao', desc: 'Steamed bao with teriyaki chicken', price: 32, img: kitchen3 },
  { name: 'Salmon Teriyaki', desc: 'Grilled salmon with teriyaki glaze', price: 56, img: kitchen2 },
].map((item, i) => ({
  id: `kitchen-${i + 1}`,
  name: item.name,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'kitchen',
  description: item.desc,
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
  slug: 'build-your-noodle-bowl',
  categoryId: 'noodles',
  description: 'Choose your base, toppings, and sauce',
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
  { id: 'egg-noodles', name: 'Egg Noodles', priceModifier: 0 },
  { id: 'rice-noodles', name: 'Rice Noodles', priceModifier: 0 },
  { id: 'udon', name: 'Udon Noodles', priceModifier: 0 },
  { id: 'soba', name: 'Soba Noodles', priceModifier: 0 },
  { id: 'white-rice', name: 'White Rice', priceModifier: 0 },
];

export const noodleToppings = [
  { id: 'chicken', name: 'Chicken', priceModifier: 8 },
  { id: 'beef', name: 'Beef', priceModifier: 12 },
  { id: 'shrimp', name: 'Shrimp', priceModifier: 14 },
  { id: 'salmon', name: 'Salmon', priceModifier: 16 },
  { id: 'egg', name: 'Egg', priceModifier: 4 },
  { id: 'broccoli', name: 'Broccoli', priceModifier: 3 },
  { id: 'onion', name: 'Onion', priceModifier: 2 },
  { id: 'bean-sprouts', name: 'Bean Sprouts', priceModifier: 2 },
  { id: 'pineapple', name: 'Pineapple', priceModifier: 3 },
  { id: 'jalapeno', name: 'Jalapeño', priceModifier: 2 },
  { id: 'sesame', name: 'Sesame', priceModifier: 1 },
  { id: 'peanuts', name: 'Peanuts', priceModifier: 2 },
  { id: 'cashew', name: 'Cashew', priceModifier: 3 },
];

export const noodleSauces = [
  { id: 'pandalina', name: 'Pandalina', priceModifier: 0 },
  { id: 'tokyo', name: 'Tokyo', priceModifier: 0 },
  { id: 'shanghai', name: 'Shanghai', priceModifier: 0 },
  { id: 'bangkok', name: 'Bangkok', priceModifier: 0 },
  { id: 'jakarta', name: 'Jakarta', priceModifier: 0 },
  { id: 'hanoi', name: 'Hanoi', priceModifier: 0 },
  { id: 'hong-kong', name: 'Hong Kong', priceModifier: 0 },
  { id: 'manila', name: 'Manila', priceModifier: 0 },
];

const platters: MenuItem[] = [
  { name: 'Pandalina Party Platter', desc: '40 pieces of mixed sushi rolls', price: 189 },
  { name: 'Sushi Lovers Tray', desc: '30 pieces of chef\'s selection rolls', price: 149 },
  { name: 'Family Combo', desc: '24 pieces with 2 kitchen sides', price: 129 },
  { name: 'Date Night Box', desc: '16 premium pieces for two', price: 99 },
].map((item, i) => ({
  id: `platter-${i + 1}`,
  name: item.name,
  slug: item.name.toLowerCase().replace(/\s+/g, '-'),
  categoryId: 'platters',
  description: item.desc,
  price: item.price,
  image: platterImg,
  tags: ['platter', 'sharing'],
  isAvailable: true,
  isCustomizable: false,
  options: [],
  isFeatured: i === 0,
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
