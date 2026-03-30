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
  const extra = options.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, opt: any) => sum + Number(opt?.priceDelta ?? opt?.price ?? 0),
    0,
  );
  return (basePrice + extra) * Number(item?.quantity || 1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMenuItemId(item: any): string | null {
  return item?.menuItem?.id ?? item?.menu_item_id ?? item?.id ?? null;
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
  latitude?: number;
  longitude?: number;
};

// ─── Inventory deduction ──────────────────────────────────────────────────────

async function deductInventory(
  restaurantId: string,
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[],
) {
  try {
    // debug — יוסר אחרי בדיקה
    console.log(
      "🔍 deductInventory items:",
      JSON.stringify(
        items.map((i) => ({
          menuItemId: i?.menuItem?.id,
          menuItemName: i?.menuItem?.name,
          itemId: i?.id,
          name: i?.name,
        })),
      ),
    );

    const menuItemIds = items.map(getMenuItemId).filter(Boolean) as string[];
    console.log("🔍 menuItemIds:", menuItemIds);

    if (!menuItemIds.length) return;

    const { data: recipes } = await db
      .from("menu_item_ingredients")
      .select("menu_item_id, ingredient_id, quantity")
      .in("menu_item_id", menuItemIds);

    console.log("🔍 recipes found:", recipes?.length ?? 0);

    if (!recipes?.length) return;

    const ingredientIds = [
      ...new Set(
        recipes.map((r: { ingredient_id: string }) => r.ingredient_id),
      ),
    ];

    const { data: ingredientsData } = await db
      .from("ingredients")
      .select("id, inventory_item_id, name")
      .in("id", ingredientIds)
      .not("inventory_item_id", "is", null);

    console.log(
      "🔍 ingredients with inventory link:",
      ingredientsData?.length ?? 0,
    );

    if (!ingredientsData?.length) return;

    const ingMap: Record<string, { inventory_item_id: string; name: string }> =
      {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingredientsData.forEach((ing: any) => {
      ingMap[ing.id] = {
        inventory_item_id: ing.inventory_item_id,
        name: ing.name,
      };
    });

    const deductions: Record<
      string,
      { quantity: number; itemNames: string[] }
    > = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((cartItem: any) => {
      const menuItemId = getMenuItemId(cartItem);
      const qty = Number(cartItem?.quantity || 1);
      const itemName = getItemResolvedName(cartItem);
      if (!menuItemId) return;

      const itemRecipes = recipes.filter(
        (r: { menu_item_id: string }) => r.menu_item_id === menuItemId,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itemRecipes.forEach((recipe: any) => {
        const ingData = ingMap[recipe.ingredient_id];
        if (!ingData) return;
        const invId = ingData.inventory_item_id;
        const totalQty = recipe.quantity * qty;
        if (!deductions[invId])
          deductions[invId] = { quantity: 0, itemNames: [] };
        deductions[invId].quantity += totalQty;
        if (!deductions[invId].itemNames.includes(itemName)) {
          deductions[invId].itemNames.push(itemName);
        }
      });
    });

    console.log("🔍 deductions:", JSON.stringify(deductions));

    if (!Object.keys(deductions).length) return;

    const invIds = Object.keys(deductions);
    const { data: currentStock } = await db
      .from("inventory_items")
      .select("id, current_stock, name")
      .in("id", invIds);

    if (!currentStock?.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const inv of currentStock as any[]) {
      const deduct = deductions[inv.id];
      if (!deduct) continue;

      const newStock = Math.max(0, Number(inv.current_stock) - deduct.quantity);

      await db
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      await db.from("inventory_movements").insert({
        restaurant_id: restaurantId,
        inventory_item_id: inv.id,
        order_id: orderId,
        menu_item_name: deduct.itemNames.join(", "),
        quantity_used: deduct.quantity,
        movement_type: "order",
        notes: "הזמנה אוטומטית",
      });
    }

    console.log("✅ inventory deduction complete");
  } catch (err) {
    console.warn("Inventory deduction error:", err);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function createOrder({
  restaurantId,
  items,
  customerDetails,
  subtotal,
  deliveryFee,
  total,
  latitude,
  longitude,
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
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;
  if (!order) throw new Error("לא נוצרה הזמנה");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    menu_item_id: getMenuItemId(item),
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

  // ─── הורד מלאי אוטומטית ───────────────────────────────────────────────────
  await deductInventory(restaurantId, order.id, items);

  return order;
}
