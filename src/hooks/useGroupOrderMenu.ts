/**
 * useGroupOrderMenu
 *
 * Standalone hook for fetching the full menu inside Group Order flows.
 * The GroupOrderRoom lives outside MenuProvider (it uses a token, not a slug),
 * so this hook replicates the same data-fetch + image-resolution logic as
 * useMenu.tsx without requiring the context.
 *
 * Imported images are shared with useMenu.tsx — Vite deduplicates them in the
 * bundle, so there is zero extra cost.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MenuItem, MenuCategory } from '@/types/menu';

// ── Same image assets as useMenu.tsx ──────────────────────────────────────────
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

// ── Image maps (mirrors useMenu.tsx) ─────────────────────────────────────────

const categoryImageMap: Record<string, string> = {
  'sushi-rolls': sushiRoll1,
  platters:      platterFamily,
  kitchen:       kitchenAsadoaki,
  noodles:       noodlesImg,
  drinks:        drinksCategoryImg,
  salads:        kitchenAvocadoSalad,
  sandwiches:    kitchenChickenBao,
};

const itemImageMap: Record<string, string> = {
  asadoaki:              kitchenAsadoaki,
  'crispy-salmon':       kitchenCrispySalmon,
  'avocado-salad':       kitchenAvocadoSalad,
  'beef-broccoli':       kitchenBeefBroccoli,
  'egg-roll':            kitchenEggRoll,
  'crispy-shrimp-tempura': kitchenShrimpTempura,
  'chicken-popcorn':     kitchenChickenPopcorn,
  'chicken-bao':         kitchenChickenBao,
  'salmon-teriyaki':     kitchenSalmonTeriyaki,
  'build-your-noodle-bowl': noodlesImg,
  'chicken-teriyaki-noodles': noodleChickenTeriyaki,
  'spicy-beef-ramen':    noodleSpicyBeef,
  'shrimp-pad-thai':     noodleShrimpPadthai,
  'veggie-lo-mein':      noodleVeggieLomein,
  'family-sushi-platter':     platterFamily,
  'party-sushi-tray':         platterParty,
  'premium-sushi-combo':      platterPremium,
  'large-sushi-celebration-tray': platterCelebration,
  'pandalina-party-platter':  platterPandalina,
  'date-night-box':           platterDateNight,
  'coca-cola':        drinkColaImg,
  'coca-cola-zero':   drinkColaImg,
  sprite:             drinkSpriteImg,
  fanta:              drinkFantaImg,
  'sparkling-water':  drinkWaterImg,
  'mineral-water':    drinkWaterImg,
  'fuse-tea':         drinkIcedTeaImg,
  goldstar:           drinkGoldstarImg,
  maccabi:            drinkGoldstarImg,
  heineken:           drinkHeinekenImg,
  corona:             drinkCoronaImg,
  asahi:              drinkAsahiImg,
  sapporo:            drinkAsahiImg,
  'red-wine-glass':   drinkRedWineImg,
  'red-wine-bottle':  drinkRedWineImg,
  'white-wine-glass': drinkWhiteWineImg,
  'white-wine-bottle': drinkWhiteWineImg,
  'rose-wine-glass':  drinkRoseWineImg,
  'rose-wine-bottle': drinkRoseWineImg,
};

const rollImages = [sushiRoll1, sushiRoll2, sushiRoll3];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupMenuCategory extends MenuCategory {
  dbId: string; // raw UUID — needed for filtering items by category
}

export interface GroupMenuItem extends MenuItem {
  // inherits MenuItem.image (always resolved, never null)
}

export interface GroupOrderMenuData {
  categories: GroupMenuCategory[];
  items: GroupMenuItem[];
  loading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGroupOrderMenu(restaurantId: string | null): GroupOrderMenuData {
  const [categories, setCategories] = useState<GroupMenuCategory[]>([]);
  const [items,      setItems]      = useState<GroupMenuItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    let cancelled = false;

    (async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
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
        ]);

        if (cancelled) return;

        const categoryRows = catRes.data  ?? [];
        const itemRows     = itemRes.data ?? [];

        // ── Build categories (same shape as useMenu) ──────────────────────────

        const cats: GroupMenuCategory[] = categoryRows.map((c: {
          id: string; slug: string; name: string; name_he?: string; name_ar?: string; sort_order: number;
        }) => ({
          dbId:     c.id,
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

        // ── Build items (same image-resolution logic as useMenu) ──────────────

        const categoryById = new Map(categoryRows.map((c: { id: string; slug: string }) => [c.id, c]));
        let sushiIdx = 0;

        const mappedItems: GroupMenuItem[] = itemRows.map((item: {
          id: string; slug: string;
          name: string; name_he?: string; name_ar?: string; name_ru?: string;
          description?: string; description_he?: string; description_ar?: string; description_ru?: string;
          category_id: string; price: number; image_url: string | null;
          is_active: boolean; is_bestseller: boolean; sort_order: number;
        }) => {
          const category     = item.category_id ? categoryById.get(item.category_id) : undefined;
          const categorySlug = (category as { slug?: string } | undefined)?.slug ?? '';
          const isSushi      = categorySlug === 'sushi-rolls';

          let image: string = item.image_url ?? '';
          if (!image) {
            if (isSushi) { image = rollImages[sushiIdx % rollImages.length]; sushiIdx++; }
            else          { image = itemImageMap[item.slug ?? ''] ?? sushiRoll1; }
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
            categoryId:  categorySlug,        // slug-based, matches cats[n].slug
            categoryDbId: item.category_id,   // UUID for filtering
            price:       Number(item.price ?? 0),
            image,
            tags:        categorySlug ? [categorySlug] : [],
            isAvailable: !!item.is_active,
            isCustomizable: false,
            options:     [],
            isFeatured:  !!item.is_bestseller,
            sortOrder:   item.sort_order ?? 0,
          } as GroupMenuItem & { categoryDbId: string };
        });

        setCategories(cats);
        setItems(mappedItems);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'שגיאה בטעינת התפריט');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [restaurantId]);

  return { categories, items, loading, error };
}
