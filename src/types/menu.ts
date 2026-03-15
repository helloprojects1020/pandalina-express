export interface OptionChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface OptionGroup {
  id: string;
  title: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  isAvailable: boolean;
  isCustomizable: boolean;
  options: OptionGroup[];
  isFeatured: boolean;
  sortOrder: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
}

export interface CartItemOption {
  groupId: string;
  groupTitle: string;
  selectedChoices: OptionChoice[];
}

export interface CartItem {
  id: string; // unique cart line id
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: CartItemOption[];
  notes: string;
  lineTotal: number;
}

export type OrderType = 'pickup' | 'delivery' | 'eat-in';

export interface CustomerDetails {
  name: string;
  phone: string;
  orderType: OrderType;
  address: string;
  notes: string;
}

export interface NoodleConfig {
  base: OptionChoice | null;
  toppings: OptionChoice[];
  sauce: OptionChoice | null;
}
