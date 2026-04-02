import { supabase } from '@/integrations/supabase/client';
import type {
  GroupOrder,
  GroupOrderFull,
  GroupOrderParticipant,
  GroupOrderParticipantFull,
  AddItemInput,
  PaymentMode,
  ParticipantPaymentMethod,
} from '@/types/groupOrder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Token generation ──────────────────────────────────────────────────────────

function generateShareToken(): string {
  return `${crypto.randomUUID()}-${Date.now().toString(36)}`;
}

// ── createGroupOrder ──────────────────────────────────────────────────────────

export async function createGroupOrder(
  restaurantId: string,
  hostName: string,
  hostPhone?: string,
  title?: string,
  paymentMode: PaymentMode = 'split',
  expiresAt?: string,
): Promise<{ groupOrder: GroupOrder; participantId: string }> {
  const shareToken = generateShareToken();

  const { data: goData, error: goError } = await db
    .from('group_orders')
    .insert({
      restaurant_id: restaurantId,
      share_token: shareToken,
      title: title ?? null,
      host_name: hostName,
      host_phone: hostPhone ?? null,
      payment_mode: paymentMode,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single();

  if (goError) throw new Error(goError.message);

  const groupOrder = goData as GroupOrder;

  const { data: pData, error: pError } = await db
    .from('group_order_participants')
    .insert({
      group_order_id: groupOrder.id,
      name: hostName,
      phone: hostPhone ?? null,
      is_host: true,
    })
    .select()
    .single();

  if (pError) throw new Error(pError.message);

  return { groupOrder, participantId: (pData as GroupOrderParticipant).id };
}

// ── joinGroupOrder ────────────────────────────────────────────────────────────

export async function joinGroupOrder(
  token: string,
  name: string,
  phone?: string,
): Promise<{ groupOrder: GroupOrder; participant: GroupOrderParticipant }> {
  const { data: goData, error: goError } = await db
    .from('group_orders')
    .select('*')
    .eq('share_token', token)
    .single();

  if (goError || !goData) throw new Error('הזמנת הקבוצה לא נמצאה');

  const groupOrder = goData as GroupOrder;

  if (groupOrder.status !== 'open') {
    throw new Error('הזמנת הקבוצה כבר לא פתוחה להצטרפות');
  }

  if (groupOrder.expires_at && new Date(groupOrder.expires_at) < new Date()) {
    throw new Error('הזמנת הקבוצה פגה תוקפה');
  }

  const { data: pData, error: pError } = await db
    .from('group_order_participants')
    .insert({
      group_order_id: groupOrder.id,
      name,
      phone: phone ?? null,
      is_host: false,
    })
    .select()
    .single();

  if (pError) throw new Error(pError.message);

  return { groupOrder, participant: pData as GroupOrderParticipant };
}

// ── addItem ───────────────────────────────────────────────────────────────────

export async function addItem(
  groupOrderId: string,
  participantId: string,
  item: AddItemInput,
): Promise<string> {
  const lineTotal =
    item.quantity *
    (item.unitPrice + (item.options ?? []).reduce((s, o) => s + o.priceDelta, 0));

  const { data: itemData, error: itemError } = await db
    .from('group_order_items')
    .insert({
      group_order_id: groupOrderId,
      participant_id: participantId,
      menu_item_id: item.menuItemId ?? null,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: lineTotal,
      notes: item.notes ?? null,
    })
    .select()
    .single();

  if (itemError) throw new Error(itemError.message);

  if (item.options && item.options.length > 0) {
    const optRows = item.options.map((o) => ({
      group_order_item_id: itemData.id,
      option_group_name: o.optionGroupName,
      option_value_name: o.optionValueName,
      price_delta: o.priceDelta,
    }));

    const { error: optError } = await db.from('group_order_item_options').insert(optRows);
    if (optError) throw new Error(optError.message);
  }

  await recalcParticipantSubtotal(groupOrderId, participantId);

  // Return the real item ID so the caller can highlight it
  return itemData.id as string;
}

// ── removeItem ────────────────────────────────────────────────────────────────

export async function removeItem(itemId: string, participantId: string): Promise<void> {
  const { data: itemData, error: fetchError } = await db
    .from('group_order_items')
    .select('group_order_id')
    .eq('id', itemId)
    .single();

  if (fetchError || !itemData) throw new Error('פריט לא נמצא');

  const { error } = await db.from('group_order_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);

  await recalcParticipantSubtotal(itemData.group_order_id, participantId);
}

// ── recalcParticipantSubtotal (internal) ──────────────────────────────────────

async function recalcParticipantSubtotal(
  groupOrderId: string,
  participantId: string,
): Promise<void> {
  const { data: items } = await db
    .from('group_order_items')
    .select('line_total')
    .eq('group_order_id', groupOrderId)
    .eq('participant_id', participantId);

  const subtotal = ((items ?? []) as { line_total: number }[]).reduce(
    (s, i) => s + Number(i.line_total),
    0,
  );

  await db
    .from('group_order_participants')
    .update({ subtotal })
    .eq('id', participantId);
}

// ── lockGroupOrder ────────────────────────────────────────────────────────────

export async function lockGroupOrder(
  groupOrderId: string,
  participantId: string,
): Promise<void> {
  const { data: pData, error: pError } = await db
    .from('group_order_participants')
    .select('is_host')
    .eq('id', participantId)
    .eq('group_order_id', groupOrderId)
    .single();

  if (pError || !pData) throw new Error('משתתף לא נמצא');
  if (!pData.is_host) throw new Error('רק המארח יכול לנעול את ההזמנה');

  const { error } = await db
    .from('group_orders')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', groupOrderId)
    .eq('status', 'open');

  if (error) throw new Error(error.message);
}

// ── fetchGroupOrderFull ───────────────────────────────────────────────────────

export async function fetchGroupOrderFull(token: string): Promise<GroupOrderFull> {
  const { data: goData, error: goError } = await db
    .from('group_orders')
    .select('*')
    .eq('share_token', token)
    .single();

  if (goError || !goData) throw new Error('הזמנת הקבוצה לא נמצאה');

  const groupOrder = goData as GroupOrderFull;

  const { data: participants, error: pError } = await db
    .from('group_order_participants')
    .select('*')
    .eq('group_order_id', groupOrder.id)
    .order('created_at', { ascending: true });

  if (pError) throw new Error(pError.message);

  const participantList = (participants ?? []) as GroupOrderParticipantFull[];

  if (participantList.length === 0) {
    groupOrder.participants = [];
    return groupOrder;
  }

  const participantIds = participantList.map((p) => p.id);

  const { data: items, error: iError } = await db
    .from('group_order_items')
    .select('*')
    .eq('group_order_id', groupOrder.id)
    .in('participant_id', participantIds)
    .order('created_at', { ascending: true });

  if (iError) throw new Error(iError.message);

  const itemList = (items ?? []) as GroupOrderFull['participants'][0]['items'];

  let optionMap: Record<string, GroupOrderFull['participants'][0]['items'][0]['options']> = {};

  if (itemList.length > 0) {
    const itemIds = itemList.map((i) => i.id);
    const { data: options } = await db
      .from('group_order_item_options')
      .select('*')
      .in('group_order_item_id', itemIds);

    for (const opt of options ?? []) {
      if (!optionMap[opt.group_order_item_id]) optionMap[opt.group_order_item_id] = [];
      optionMap[opt.group_order_item_id].push(opt);
    }
  }

  const itemsByParticipant: Record<string, GroupOrderFull['participants'][0]['items']> = {};
  for (const item of itemList) {
    if (!itemsByParticipant[item.participant_id]) itemsByParticipant[item.participant_id] = [];
    itemsByParticipant[item.participant_id].push({
      ...item,
      options: optionMap[item.id] ?? [],
    });
  }

  groupOrder.participants = participantList.map((p) => ({
    ...p,
    items: itemsByParticipant[p.id] ?? [],
  }));

  return groupOrder;
}

// ── markParticipantPaid ───────────────────────────────────────────────────────

export async function markParticipantPaid(participantId: string): Promise<void> {
  const { error } = await db
    .from('group_order_participants')
    .update({ payment_status: 'paid' })
    .eq('id', participantId);

  if (error) throw new Error(error.message);
}

export async function markParticipantUnpaid(participantId: string): Promise<void> {
  const { error } = await db
    .from('group_order_participants')
    .update({ payment_status: 'unpaid' })
    .eq('id', participantId);

  if (error) throw new Error(error.message);
}

// ── setParticipantPaymentMethod ───────────────────────────────────────────────

export async function setParticipantPaymentMethod(
  participantId: string,
  method: ParticipantPaymentMethod,
): Promise<void> {
  const { error } = await db.rpc('set_participant_payment_method', {
    p_participant_id: participantId,
    p_method: method,
  });
  if (error) throw new Error(error.message);
}

// ── submitGroupOrder ──────────────────────────────────────────────────────────
// Returns the created order UUID (from RPC v2).

export async function submitGroupOrder(groupOrderId: string): Promise<string> {
  const { data, error } = await db.rpc('submit_group_order', {
    p_group_order_id: groupOrderId,
  });
  if (error) throw new Error(error.message);
  return data as string; // the created order UUID
}
