// ── Group Order type literals ─────────────────────────────────────────────────

export type GroupOrderStatus = 'open' | 'locked' | 'submitted' | 'cancelled' | 'expired';
export type PaymentMode = 'split' | 'host_pays_all';
export type ParticipantStatus = 'active' | 'left' | 'locked';
export type ParticipantPaymentStatus = 'unpaid' | 'paid' | 'partially_paid' | 'failed';
export type ParticipantPaymentMethod = 'none' | 'cash' | 'online';
export type GroupOrderPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ── Core table shapes ─────────────────────────────────────────────────────────

export interface GroupOrder {
  id: string;
  restaurant_id: string;
  share_token: string;
  title: string | null;
  host_name: string;
  host_phone: string | null;
  status: GroupOrderStatus;
  payment_mode: PaymentMode;
  notes: string | null;
  expires_at: string | null;
  locked_at: string | null;
  submitted_at: string | null;
  final_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupOrderParticipant {
  id: string;
  group_order_id: string;
  name: string;
  phone: string | null;
  is_host: boolean;
  status: ParticipantStatus;
  payment_status: ParticipantPaymentStatus;
  payment_method?: ParticipantPaymentMethod;
  subtotal: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupOrderItem {
  id: string;
  group_order_id: string;
  participant_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupOrderItemOption {
  id: string;
  group_order_item_id: string;
  option_group_name: string;
  option_value_name: string;
  price_delta: number;
  created_at: string;
}

export interface GroupOrderPayment {
  id: string;
  group_order_id: string;
  participant_id: string | null;
  payment_mode: PaymentMode;
  amount: number;
  currency: string;
  status: GroupOrderPaymentStatus;
  provider: string | null;
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Rich composite types ──────────────────────────────────────────────────────

export interface GroupOrderItemFull extends GroupOrderItem {
  options: GroupOrderItemOption[];
}

export interface GroupOrderParticipantFull extends GroupOrderParticipant {
  items: GroupOrderItemFull[];
}

export interface GroupOrderFull extends GroupOrder {
  participants: GroupOrderParticipantFull[];
}

// ── Computed summary ──────────────────────────────────────────────────────────

export interface GroupOrderSummary {
  group_order_id: string;
  title: string | null;
  host_name: string;
  status: GroupOrderStatus;
  payment_mode: PaymentMode;
  participant_count: number;
  total_items: number;
  grand_total: number;
  paid_total: number;
  unpaid_total: number;
  share_url: string;
}

// ── Create/join input shapes ──────────────────────────────────────────────────

export interface CreateGroupOrderInput {
  restaurantId: string;
  hostName: string;
  hostPhone?: string;
  title?: string;
  paymentMode?: PaymentMode;
  expiresAt?: string;
}

export interface AddItemInput {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  options?: Array<{
    optionGroupName: string;
    optionValueName: string;
    priceDelta: number;
  }>;
}