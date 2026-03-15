import { create } from 'zustand';
import type { CartItem, MenuItem, CartItemOption, CustomerDetails, OrderType } from '@/types/menu';

interface CartStore {
  items: CartItem[];
  customerDetails: CustomerDetails;
  deliveryFee: number;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  prepTime: string;
  editingCartItemId: string | null;

  addItem: (menuItem: MenuItem, quantity: number, selectedOptions: CartItemOption[], notes: string) => void;
  updateItem: (cartItemId: string, quantity: number, selectedOptions: CartItemOption[], notes: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setCheckoutOpen: (open: boolean) => void;
  setCustomerDetails: (details: Partial<CustomerDetails>) => void;
  setOrderType: (type: OrderType) => void;
  setPrepTime: (time: string) => void;
  setEditingCartItemId: (id: string | null) => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const calculateLineTotal = (item: MenuItem, quantity: number, options: CartItemOption[]): number => {
  const optionsTotal = options.reduce(
    (sum, opt) => sum + opt.selectedChoices.reduce((s, c) => s + c.priceModifier, 0),
    0
  );
  return (item.price + optionsTotal) * quantity;
};

let idCounter = 0;

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerDetails: {
    name: '',
    phone: '',
    orderType: 'pickup',
    address: '',
    notes: '',
  },
  deliveryFee: 10,
  isCartOpen: false,
  isCheckoutOpen: false,
  prepTime: '',
  editingCartItemId: null,

  addItem: (menuItem, quantity, selectedOptions, notes) => {
    const id = `cart-${++idCounter}-${Date.now()}`;
    const lineTotal = calculateLineTotal(menuItem, quantity, selectedOptions);
    set((state) => ({
      items: [...state.items, { id, menuItem, quantity, selectedOptions, notes, lineTotal }],
    }));
  },

  updateItem: (cartItemId, quantity, selectedOptions, notes) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity,
              selectedOptions,
              notes,
              lineTotal: calculateLineTotal(item.menuItem, quantity, selectedOptions),
            }
          : item
      ),
      editingCartItemId: null,
    }));
  },

  removeItem: (cartItemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== cartItemId) })),

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity, lineTotal: calculateLineTotal(item.menuItem, quantity, item.selectedOptions) }
          : item
      ),
    }));
  },

  updateNotes: (cartItemId, notes) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === cartItemId ? { ...item, notes } : item)),
    })),

  clearCart: () => set({ items: [] }),

  setCartOpen: (open) => set({ isCartOpen: open }),
  setCheckoutOpen: (open) => set({ isCheckoutOpen: open }),
  setPrepTime: (time) => set({ prepTime: time }),
  setEditingCartItemId: (id) => set({ editingCartItemId: id }),

  setCustomerDetails: (details) =>
    set((state) => ({ customerDetails: { ...state.customerDetails, ...details } })),

  setOrderType: (type) =>
    set((state) => ({ customerDetails: { ...state.customerDetails, orderType: type } })),

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const fee = get().customerDetails.orderType === 'delivery' ? get().deliveryFee : 0;
    return subtotal + fee;
  },
  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
