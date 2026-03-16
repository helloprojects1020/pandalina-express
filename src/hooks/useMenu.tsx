import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MenuItem, MenuCategory, OptionGroup, OptionChoice } from '@/types/menu';

// Static image imports — used as fallback when DB has no image_url
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

// Fallback image maps (slug → local asset)
const categoryImageMap: Record<string, string> = {
  'sushi-rolls': sushiRoll1,
  platters: platterFamily,
  kitchen: kitchenAsadoaki,
  noodles: noodlesImg,
  drinks: drinksCategoryImg,
};

const rollImages = [sushiRoll1, sushiRoll2, sushiRoll3];

const itemImageMap: Record<string, string> = {
  'asadoaki': kitchenAsadoaki, 'crispy-salmon': kitchenCrispySalmon,
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
  'sprite': drinkSpriteImg, 'fanta': drinkFantaImg,
  'sparkling-water': drinkWaterImg, 'mineral-water': drinkWaterImg,
  'fuse-tea': drinkIcedTeaImg,
  'goldstar': drinkGoldstarImg, 'maccabi': drinkGoldstarImg,
  'heineken': drinkHeinekenImg, 'corona': drinkCoronaImg,
  'asahi': drinkAsahiImg, 'sapporo': drinkAsahiImg,
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
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [noodleBases, setNoodleBases] = useState<OptionChoice[]>([]);
  const [noodleToppings, setNoodleToppings] = useState<OptionChoice[]>([]);
  const [noodleSauces, setNoodleSauces] = useState<OptionChoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      // Fetch categories, items, and options in parallel
      const [catRes, itemRes, optRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_item_options').select('*').order('sort_order'),
      ]);

      // Map categories
      const cats: MenuCategory[] = (catRes.data ?? []).map(c => ({
        id: c.slug,
        name: c.name_en ?? c.name_he,
        name_he: c.name_he,
        name_ar: c.name_ar ?? undefined,
        name_en: c.name_en ?? undefined,
        name_ru: c.name_ru ?? undefined,
        slug: c.slug,
        description: c.description_en ?? c.description_he ?? '',
        description_he: c.description_he ?? undefined,
        description_ar: c.description_ar ?? undefined,
        description_en: c.description_en ?? undefined,
        description_ru: c.description_ru ?? undefined,
        image: c.image_url ?? categoryImageMap[c.slug] ?? sushiRoll1,
        sortOrder: c.sort_order,
      }));

      // Group options by menu_item UUID
      const optionsByItem = new Map<string, typeof optRes.data>();
      for (const opt of (optRes.data ?? [])) {
        const arr = optionsByItem.get(opt.menu_item_id) ?? [];
        arr.push(opt);
        optionsByItem.set(opt.menu_item_id, arr);
      }

      // Map menu items
      let sushiIdx = 0;
      const items: MenuItem[] = (itemRes.data ?? []).map(item => {
        const catRow = catRes.data?.find(c => c.id === item.category_id);
        const catSlug = catRow?.slug ?? '';
        const isSushi = catSlug === 'sushi-rolls';

        // Build options
        const rawOpts = optionsByItem.get(item.id) ?? [];
        const grouped = new Map<string, { group_he: string; group_en: string; group_ar: string | null; group_ru: string | null; choices: OptionChoice[] }>();
        for (const o of rawOpts) {
          const key = o.group_name_he;
          if (!grouped.has(key)) {
            grouped.set(key, { group_he: o.group_name_he, group_en: o.group_name_en ?? o.group_name_he, group_ar: o.group_name_ar, group_ru: o.group_name_ru, choices: [] });
          }
          grouped.get(key)!.choices.push({
            id: o.id,
            name: o.option_name_en ?? o.option_name_he,
            name_he: o.option_name_he,
            name_ar: o.option_name_ar ?? undefined,
            name_en: o.option_name_en ?? undefined,
            name_ru: o.option_name_ru ?? undefined,
            priceModifier: Number(o.price_add),
          });
        }

        const options: OptionGroup[] = Array.from(grouped.entries()).map(([, g]) => ({
          id: g.group_en.toLowerCase().replace(/\s+/g, '-'),
          title: g.group_en,
          title_he: g.group_he,
          title_ar: g.group_ar ?? undefined,
          title_en: g.group_en ?? undefined,
          title_ru: g.group_ru ?? undefined,
          type: 'multiple' as const,
          required: false,
          choices: g.choices,
        }));

        // Image fallback
        let image = item.image_url;
        if (!image) {
          if (isSushi) {
            image = rollImages[sushiIdx % rollImages.length];
            sushiIdx++;
          } else {
            image = itemImageMap[item.slug] ?? sushiRoll1;
          }
        }

        return {
          id: item.slug,
          name: item.name_en ?? item.name_he,
          name_he: item.name_he,
          name_ar: item.name_ar ?? undefined,
          name_en: item.name_en ?? undefined,
          name_ru: item.name_ru ?? undefined,
          slug: item.slug,
          categoryId: catSlug,
          description: item.description_en ?? item.description_he ?? '',
          description_he: item.description_he ?? undefined,
          description_ar: item.description_ar ?? undefined,
          description_en: item.description_en ?? undefined,
          description_ru: item.description_ru ?? undefined,
          price: Number(item.price),
          image: image!,
          tags: [catSlug],
          isAvailable: item.is_active,
          isCustomizable: options.length > 0,
          options,
          isFeatured: item.is_bestseller,
          sortOrder: item.sort_order,
        };
      });

      // Extract noodle builder options from the "build-your-noodle-bowl" item
      const noodleItem = items.find(i => i.slug === 'build-your-noodle-bowl');
      if (noodleItem) {
        const baseGroup = noodleItem.options.find(g => g.title_he === 'בסיס');
        const toppingGroup = noodleItem.options.find(g => g.title_he === 'תוספות');
        const sauceGroup = noodleItem.options.find(g => g.title_he === 'רוטב');
        setNoodleBases(baseGroup?.choices ?? []);
        setNoodleToppings(toppingGroup?.choices ?? []);
        setNoodleSauces(sauceGroup?.choices ?? []);
      }

      setCategories(cats);
      setMenuItems(items);
      setLoading(false);
    };

    fetchMenu();
  }, []);

  const featuredItems = menuItems.filter(i => i.isFeatured);
  const getItemsByCategory = (categoryId: string) =>
    menuItems.filter(i => i.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <MenuContext.Provider value={{ categories, menuItems, featuredItems, noodleBases, noodleToppings, noodleSauces, getItemsByCategory, loading }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
};
