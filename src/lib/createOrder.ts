import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemResolvedName(item: any): string {
  return (
    item?.menuItem?.name_he || item?.menuItem?.name || item?.name || "פריט"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemResolvedBasePrice(item: any): number {
  return Number(item?.menuItem?.price ?? item?.price ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemOptions(item: any) {
  if (Array.isArray(item?.selectedOptions)) return item.selectedOptions;
  if (Array.isArray(item?.options)) return item.options;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemTotal(item: any): number {
  const basePrice = getItemResolvedBasePrice(item);
  const options = getItemOptions(item);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra = options.reduce(
    (sum: number, opt: any) => sum + Number(opt?.priceDelta ?? opt?.price ?? 0),
    0,
  );
  return (basePrice + extra) * Number(item?.quantity || 1);
}

type CreateOrderParams = {
  restaurantId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customerDetails: any;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export async function createOrder({
  restaurantId,
  items,
  customerDetails,
  subtotal,
  deliveryFee,
  total,
}: CreateOrderParams) {
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      customer_name: customerDetails.name,
      customer_phone: customerDetails.phone,
      address: customerDetails.address ?? null,
      notes: customerDetails.notes ?? null,
      order_type:
        customerDetails.orderType === "eat-in"
          ? "dine_in"
          : customerDetails.orderType,
      status: "new",
      source: "whatsapp",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      payment_method: "cash",
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError) throw orderError;
  if (!order) throw new Error("לא נוצרה הזמנה");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    menu_item_id: item?.menuItem?.id ?? null,
    menu_item_name: getItemResolvedName(item),
    quantity: Number(item?.quantity || 1),
    unit_price: getItemResolvedBasePrice(item),
    price: getItemResolvedBasePrice(item),
    line_total: getItemTotal(item),
    notes: item?.notes ?? null,
  }));

  const { data: insertedItems, error: itemsError } = await db
    .from("order_items")
    .insert(orderItems)
    .select("id");

  if (itemsError) throw itemsError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optionRows: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const insertedItem = insertedItems?.[i];
    if (!insertedItem) continue;

    const optionList = getItemOptions(item);
    for (const opt of optionList) {
      const choices = Array.isArray(opt.selectedChoices)
        ? opt.selectedChoices
        : [];
      for (const choice of choices) {
        optionRows.push({
          order_item_id: insertedItem.id,
          option_group_name: opt.groupTitle ?? opt.groupName ?? "תוספת",
          option_item_name: choice.name_he ?? choice.name ?? "בחירה",
          option_price: Number(choice.priceModifier ?? 0),
        });
      }
    }
  }

  if (optionRows.length > 0) {
    await db.from("order_item_options").insert(optionRows);
  }

  return order;
}
