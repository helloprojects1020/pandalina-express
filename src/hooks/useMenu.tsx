import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MenuItem, MenuCategory, OptionGroup, OptionChoice } from '@/types/menu';

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

const categoryImageMap: Record<string, string> = {
  'sushi-rolls': sushiRoll1,
  platters: platterFamily,
  kitchen: kitchenAsadoaki,
  noodles: noodlesImg,
  drinks: drinksCategoryImg,
  salads: kitchenAvocadoSalad,
  sandwiches: kitchenChickenBao,
};

const rollImages = [sushiRoll1, sushiRoll2, sushiRoll3];

const itemImageMap: Record<string, string> = {
  asadoaki: kitchenAsadoaki, 'crispy-salmon': kitchenCrispySalmon,
  'avocado-salad': kitchenAvocadoSalad, 'beef-broccoli': kitchenBeefBroccoli,
  'egg-roll': kitchenEggRoll, 'crispy-shrimp-tempura': kitchenShrimpTempura,
  'chicken-popcorn': kitchenChickenPopcorn, 'chicken-bao': kitchenChickenBao,
  'salmon-teriyaki': kitchenSalmonTeriyaki,
  'build-your-noodle-bowl': noodlesImg, 'chicken-teriyaki-noodles': noodleChickenTeriyaki,
  'spicy-beef-ramen': noodleSpicyBeef, 'shrimp-pad-thai': noodleShrimpPadthai,
  'veggie-lo-mein': noodleVeggieLomein,
  'family-sushi-platter': platterFamily, 'party-sushi-tray': platterParty,
  'premium-sushi-combo': platterPremium, 'large-sushi-celebration-tray': platterCelebration,
  'pandalina-party-platter': platterPandalina, 'date-night-box': platterDateNight,
  'coca-cola': drinkColaImg, 'coca-cola-zero': drinkColaImg,
  sprite: drinkSpriteImg, fanta: drinkFantaImg,
  'sparkling-water': drinkWaterImg, 'mineral-water': drinkWaterImg,
  'fuse-tea': drinkIcedTeaImg,
  goldstar: drinkGoldstarImg, maccabi: drinkGoldstarImg,
  heineken: drinkHeinekenImg, corona: drinkCoronaImg,
  asahi: drinkAsahiImg, sapporo: drinkAsahiImg,
  'red-wine-glass': drinkRedWineImg, 'red-wine-bottle': drinkRedWineImg,
  'white-wine-glass': drinkWhiteWineImg, 'white-wine-bottle': drinkWhiteWineImg,
  'rose-wine-glass': drinkRoseWineImg, 'rose-wine-bottle': drinkRoseWineImg,
};

interface MenuContextValue {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  featuredItems: MenuItem[];
  noodleBases: OptionChoice[];
  noodleToppings: OptionChoice[];
  noodleSauces: OptionChoice[];
  getItemsByCategory: (categorySlug: string) => MenuItem[];
  loading: boolean;
  error: string | null;
  restaurantId: string | null;
  outOfStockIds: Set<string>;
  inventoryTrackingEnabled: boolean;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type MenuProviderProps = {
  children: ReactNode;
  restaurantSlug: string; // חובה — כל מי שמשתמש ב-MenuProvider חייב לציין slug
};

// eslint-disable-next-line react-refresh/only-export-components
export const MenuProvider = ({ children, restaurantSlug }: MenuProviderProps) => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories]     = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems]       = useState<MenuItem[]>([]);
  const [noodleBases, setNoodleBases]   = useState<OptionChoice[]>([]);
  const [noodleToppings, setNoodleToppings] = useState<OptionChoice[]>([]);
  const [noodleSauces, setNoodleSauces] = useState<OptionChoice[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [outOfStockIds, setOutOfStockIds]               = useState<Set<string>>(new Set());
  const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(false);

  // ── Step 1: resolve restaurantId from slug ─────────────────────────────────
  useEffect(() => {
    if (!restaurantSlug) return;
    db.from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .single()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data?.id) setRestaurantId(data.id);
        else setError(`Restaurant not found: ${restaurantSlug}`);
      });
  }, [restaurantSlug]);

  // ── Step 2: fetch menu once we have restaurantId ───────────────────────────
  useEffect(() => {
    if (!restaurantId) return;

    const fetchMenu = async () => {
      try {
        const [catRes, itemRes, optGroupRes, optValRes] = await Promise.all([
          db.from('categories')
            .select('id, restaurant_id, name, name_he, name_ar, slug, sort_order, is_active')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order'),

          db.from('menu_items')
            .select(`
              id, restaurant_id, category_id, slug, price, image_url,
              is_active, is_bestseller, sort_order,
              name, name_he, name_ar, name_ru,
              description, description_he, description_ar, description_ru
            `)
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order'),

          db.from('menu_item_options')
            .select('id, menu_item_id, name, min_select, max_select, is_required, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order'),

          db.from('menu_item_option_values')
            .select('id, option_id, name, name_he, name_ar, price_modifier, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order'),
        ]);

        const categoryRows  = catRes.data  ?? [];
        const itemRows      = itemRes.data  ?? [];
        const optionGroups  = optGroupRes.data ?? [];
        const optionValues  = optValRes.data   ?? [];

        const itemIdSet      = new Set(itemRows.map((i: { id: string }) => i.id));
        const filteredGroups = optionGroups.filter((g: { menu_item_id: string }) => itemIdSet.has(g.menu_item_id));
        const groupIdSet     = new Set(filteredGroups.map((g: { id: string }) => g.id));
        const filteredValues = optionValues.filter((v: { option_id: string }) => groupIdSet.has(v.option_id));

        const cats: MenuCategory[] = categoryRows.map((c: {
          id: string; slug: string;
          name: string; name_he?: string; name_ar?: string;
          sort_order: number;
        }) => ({
          id:       c.slug ?? c.id,
          name:     c.name_he ?? c.name ?? c.slug,
          name_he:  c.name_he ?? c.name ?? undefined,
          name_ar:  c.name_ar ?? undefined,
          name_en:  c.name ?? undefined,
          name_ru:  c.name_he ?? c.name ?? undefined,
          slug:     c.slug ?? c.id,
          description: '',
          image:    categoryImageMap[c.slug ?? ''] ?? sushiRoll1,
          sortOrder: c.sort_order ?? 0,
        }));

        const valuesByGroupId = new Map<string, typeof filteredValues>();
        for (const v of filteredValues) {
          const arr = valuesByGroupId.get(v.option_id) ?? [];
          arr.push(v);
          valuesByGroupId.set(v.option_id, arr);
        }

        const groupsByItemId = new Map<string, typeof filteredGroups>();
        for (const g of filteredGroups) {
          const arr = groupsByItemId.get(g.menu_item_id) ?? [];
          arr.push(g);
          groupsByItemId.set(g.menu_item_id, arr);
        }

        const categoryById = new Map(categoryRows.map((c: { id: string; slug: string }) => [c.id, c]));

        let sushiIdx = 0;
        const items: MenuItem[] = itemRows.map((item: {
          id: string; slug: string;
          name: string; name_he?: string; name_ar?: string; name_ru?: string;
          description?: string; description_he?: string; description_ar?: string; description_ru?: string;
          category_id: string; price: number; image_url: string | null;
          is_active: boolean; is_bestseller: boolean; sort_order: number;
        }) => {
          const category     = item.category_id ? categoryById.get(item.category_id) : undefined;
          const categorySlug = (category as { slug?: string } | undefined)?.slug ?? '';
          const isSushi      = categorySlug === 'sushi-rolls';

          const rawGroups = groupsByItemId.get(item.id) ?? [];
          const options: OptionGroup[] = rawGroups.map((group: {
            id: string; name: string; max_select: number; is_required: boolean;
          }) => {
            const rawValues = valuesByGroupId.get(group.id) ?? [];
            const choices: OptionChoice[] = rawValues.map((v: {
              id: string; name: string; name_he?: string; name_ar?: string; price_modifier: number;
            }) => ({
              id:            v.id,
              name:          v.name_he ?? v.name,
              name_he:       v.name_he ?? v.name,
              name_ar:       v.name_ar ?? undefined,
              name_en:       v.name,
              name_ru:       v.name_he ?? v.name,
              priceModifier: Number(v.price_modifier ?? 0),
            }));
            return {
              id:       group.id,
              title:    group.name,
              title_he: group.name,
              title_en: group.name,
              type:     (group.max_select ?? 1) === 1 ? 'single' as const : 'multiple' as const,
              required: !!group.is_required,
              choices,
            };
          });

          let image = item.image_url;
          if (!image) {
            if (isSushi) { image = rollImages[sushiIdx % rollImages.length]; sushiIdx++; }
            else { image = itemImageMap[item.slug ?? ''] ?? sushiRoll1; }
          }

          return {
            id:          item.id,
            slug:        item.slug ?? item.id,
            name:        item.name_he ?? item.name ?? item.slug ?? item.id,
            name_he:     item.name_he ?? item.name ?? undefined,
            name_ar:     item.name_ar ?? undefined,
            name_en:     item.name ?? item.name_he ?? undefined,
            name_ru:     item.name_ru ?? item.name_he ?? item.name ?? undefined,
            description:    item.description_he ?? item.description ?? '',
            description_he: item.description_he ?? item.description ?? undefined,
            description_ar: item.description_ar ?? undefined,
            description_en: item.description ?? item.description_he ?? undefined,
            description_ru: item.description_ru ?? item.description_he ?? item.description ?? undefined,
            categoryId:  categorySlug,
            price:       Number(item.price ?? 0),
            image:       image!,
            tags:        categorySlug ? [categorySlug] : [],
            isAvailable: !!item.is_active,
            isCustomizable: options.length > 0,
            options,
            isFeatured:  !!item.is_bestseller,
            sortOrder:   item.sort_order ?? 0,
            menuItem:    item,
          };
        });

        const noodleItem = items.find(i => i.slug === 'build-your-noodle-bowl');
        if (noodleItem) {
          const baseGroup    = noodleItem.options.find(g => g.title_he === 'בסיס'    || g.title === 'Base');
          const toppingGroup = noodleItem.options.find(g => g.title_he === 'תוספות' || g.title === 'Toppings');
          const sauceGroup   = noodleItem.options.find(g => g.title_he === 'רוטב'   || g.title === 'Sauce');
          setNoodleBases(baseGroup?.choices ?? []);
          setNoodleToppings(toppingGroup?.choices ?? []);
          setNoodleSauces(sauceGroup?.choices ?? []);
        }

        setCategories(cats);
        setMenuItems(items);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load menu';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  // ── Step 3: inventory flags + out-of-stock items ───────────────────────────
  // Runs in parallel with the menu fetch (both triggered by restaurantId).
  // RPC is called when inventory_tracking_enabled OR out_of_stock_ui_enabled is true.
  useEffect(() => {
    if (!restaurantId) return;

    const fetchStockFlags = async () => {
      const { data: s, error: settingsError } = await db
        .from('restaurant_settings')
        .select('inventory_tracking_enabled, out_of_stock_ui_enabled')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      console.log('[useMenu] settings row:', s, 'error:', settingsError);

      const trackingEnabled = s?.inventory_tracking_enabled ?? false;
      const uiEnabled = s?.out_of_stock_ui_enabled ?? false;

      console.log('[useMenu] trackingEnabled:', trackingEnabled, 'uiEnabled:', uiEnabled);

      setInventoryTrackingEnabled(trackingEnabled);

      // Always fetch out-of-stock list — the RPC is cheap and needed whenever
      // either flag is on. Skipping it based on flags caused production bugs
      // where the settings row existed but had stale/false defaults.
      const { data: stockData, error: rpcError } = await db
        .rpc('get_out_of_stock_menu_items', { p_restaurant_id: restaurantId });

      console.log('[useMenu] RPC stockData:', stockData, 'error:', rpcError);

      if (rpcError) {
        console.error('[useMenu] get_out_of_stock_menu_items RPC error:', rpcError);
      } else if (Array.isArray(stockData)) {
        const ids = new Set(stockData.map((r: { menu_item_id: string }) => r.menu_item_id));
        console.log('[useMenu] outOfStockIds built:', [...ids]);
        setOutOfStockIds(ids);
      }
    };

    fetchStockFlags();
  }, [restaurantId]);

  const featuredItems      = menuItems.filter(i => i.isFeatured);
  const getItemsByCategory = (categorySlug: string) =>
    menuItems.filter(i => i.categoryId === categorySlug).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <MenuContext.Provider value={{
      categories, menuItems, featuredItems,
      noodleBases, noodleToppings, noodleSauces,
      getItemsByCategory, loading, error,
      restaurantId,
      outOfStockIds,
      inventoryTrackingEnabled,
    }}>
      {children}
    </MenuContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMenu = (): MenuContextValue => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
};