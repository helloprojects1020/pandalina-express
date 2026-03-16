export interface LocalizedFields {
  name_he?: string;
  name_ar?: string;
  name_en?: string;
  name_ru?: string;
  description_he?: string;
  description_ar?: string;
  description_en?: string;
  description_ru?: string;
}

export interface OptionChoice extends LocalizedFields {
  id: string;
  name: string;
  priceModifier: number;
}

export interface OptionGroup {
  id: string;
  title: string;
  title_he?: string;
  title_ar?: string;
  title_en?: string;
  title_ru?: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: OptionChoice[];
}

export interface MenuItem extends LocalizedFields {
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

export interface MenuCategory extends LocalizedFields {
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
