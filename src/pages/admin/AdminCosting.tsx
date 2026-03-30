import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Search, TrendingUp, TrendingDown, AlertTriangle, ChefHat, Package, Calculator } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier_id: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  name_he: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
};

type MenuItemIngredient = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
};

type Supplier = {
  id: string;
  name: string;
};

const UNITS = ['גרם', 'ק"ג', 'מ"ל', 'ליטר', 'יחידה', 'כף', 'כפית', 'כוס'];

// ─── Margin helpers ───────────────────────────────────────────────────────────

function getMarginColor(margin: number): string {
  if (margin >= 60) return 'text-green-600';
  if (margin >= 40) return 'text-yellow-600';
  if (margin >= 20) return 'text-orange-600';
  return 'text-red-600';
}

function getMarginBadge(margin: number): { label: string; color: string } {
  if (margin >= 60) return { label: 'מרווח גבוה', color: 'bg-green-500/10 text-green-700 border-green-200' };
  if (margin >= 40) return { label: 'מרווח בינוני', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };
  if (margin >= 20) return { label: 'מרווח נמוך', color: 'bg-orange-500/10 text-orange-700 border-orange-200' };
  return { label: '🔴 מרווח קריטי', color: 'bg-red-500/10 text-red-700 border-red-200' };
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminCosting = () => {
  const { restaurantId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<MenuItemIngredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dishes' | 'ingredients'>('dishes');
  const [search, setSearch] = useState('');
  const [filterMargin, setFilterMargin] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Recipe editor
  const [recipeSheet, setRecipeSheet] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [dishRecipe, setDishRecipe] = useState<MenuItemIngredient[]>([]);
  const [simPrice, setSimPrice] = useState<number>(0);

  // Ingredient editor
  const [ingredientSheet, setIngredientSheet] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'גרם', cost_per_unit: 0, supplier_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    Promise.all([
      db.from('menu_items').select('id, name, name_he, price, category_id, image_url').eq('restaurant_id', restaurantId).order('name'),
      db.from('ingredients').select('*').eq('restaurant_id', restaurantId).order('name'),
      db.from('menu_item_ingredients').select('*'),
      db.from('suppliers').select('id, name').eq('restaurant_id', restaurantId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([menuRes, ingRes, recipeRes, suppRes]: any[]) => {
      setMenuItems(menuRes.data ?? []);
      setIngredients(ingRes.data ?? []);
      setRecipes(recipeRes.data ?? []);
      setSuppliers(suppRes.data ?? []);
      setLoading(false);
    });
  }, [restaurantId]);

  // ─── Cost calculation ───────────────────────────────────────────────────────

  const calcDishCost = (menuItemId: string): number => {
    const dishRecipes = recipes.filter(r => r.menu_item_id === menuItemId);
    return dishRecipes.reduce((sum, r) => {
      const ing = ingredients.find(i => i.id === r.ingredient_id);
      return sum + (ing ? ing.cost_per_unit * r.quantity : 0);
    }, 0);
  };

  const dishStats = useMemo(() => {
    return menuItems.map(item => {
      const cost = calcDishCost(item.id);
      const price = item.price;
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;
      const hasRecipe = recipes.some(r => r.menu_item_id === item.id);
      return { ...item, cost, profit, margin, hasRecipe };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems, ingredients, recipes]);

  const filteredDishes = dishStats.filter(d => {
    const matchSearch = (d.name_he ?? d.name).toLowerCase().includes(search.toLowerCase());
    const matchMargin = filterMargin === 'all' ? true
      : filterMargin === 'low' ? d.margin < 30
      : filterMargin === 'medium' ? d.margin >= 30 && d.margin < 60
      : d.margin >= 60;
    return matchSearch && matchMargin;
  });

  // ─── Summary stats ──────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const withRecipe = dishStats.filter(d => d.hasRecipe);
    if (!withRecipe.length) return null;
    const avgMargin = withRecipe.reduce((s, d) => s + d.margin, 0) / withRecipe.length;
    const lowMargin = withRecipe.filter(d => d.margin < 30).length;
    const bestDish = withRecipe.reduce((a, b) => a.margin > b.margin ? a : b);
    const worstDish = withRecipe.reduce((a, b) => a.margin < b.margin ? a : b);
    return { avgMargin, lowMargin, bestDish, worstDish, total: withRecipe.length };
  }, [dishStats]);

  // ─── Recipe editor ──────────────────────────────────────────────────────────

  const openRecipe = (dish: MenuItem) => {
    setSelectedDish(dish);
    setDishRecipe(recipes.filter(r => r.menu_item_id === dish.id));
    setSimPrice(dish.price);
    setRecipeSheet(true);
  };

  const addIngredientToRecipe = () => {
    if (!selectedDish || !ingredients.length) return;
    const tempId = `new-${Date.now()}`;
    setDishRecipe(prev => [...prev, {
      id: tempId,
      menu_item_id: selectedDish.id,
      ingredient_id: ingredients[0].id,
      quantity: 1,
    }]);
  };

  const saveRecipe = async () => {
    if (!selectedDish) return;
    setSaving(true);

    // מחק קיימים
    await db.from('menu_item_ingredients').delete().eq('menu_item_id', selectedDish.id);

    // הוסף חדשים
    if (dishRecipe.length > 0) {
      const rows = dishRecipe.map(r => ({
        menu_item_id: selectedDish.id,
        ingredient_id: r.ingredient_id,
        quantity: r.quantity,
      }));
      const { data, error } = await db.from('menu_item_ingredients').insert(rows).select('*');
      if (error) {
        setSaving(false);
        toast({ title: 'שגיאה בשמירה', description: error.message, variant: 'destructive' });
        return;
      }
      // עדכן recipes state
      setRecipes(prev => [
        ...prev.filter(r => r.menu_item_id !== selectedDish.id),
        ...(data ?? []),
      ]);
    } else {
      setRecipes(prev => prev.filter(r => r.menu_item_id !== selectedDish.id));
    }

    setSaving(false);
    toast({ title: 'המתכון נשמר ✅' });
    setRecipeSheet(false);
  };

  // ─── Ingredient CRUD ────────────────────────────────────────────────────────

  const openCreateIngredient = () => {
    setEditingIngredient(null);
    setIngredientForm({ name: '', unit: 'גרם', cost_per_unit: 0, supplier_id: '' });
    setIngredientSheet(true);
  };

  const openEditIngredient = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setIngredientForm({ name: ing.name, unit: ing.unit, cost_per_unit: ing.cost_per_unit, supplier_id: ing.supplier_id ?? '' });
    setIngredientSheet(true);
  };

  const saveIngredient = async () => {
    if (!restaurantId || !ingredientForm.name) {
      toast({ title: 'שם המרכיב הוא שדה חובה', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      ...ingredientForm,
      restaurant_id: restaurantId,
      supplier_id: ingredientForm.supplier_id || null,
      updated_at: new Date().toISOString(),
    };

    if (editingIngredient) {
      const { data, error } = await db.from('ingredients').update(payload).eq('id', editingIngredient.id).select('*').single();
      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setIngredients(prev => prev.map(i => i.id === editingIngredient.id ? data : i));
      toast({ title: 'המרכיב עודכן ✅' });
    } else {
      const { data, error } = await db.from('ingredients').insert(payload).select('*').single();
      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setIngredients(prev => [...prev, data]);
      toast({ title: 'המרכיב נוסף ✅' });
    }
    setIngredientSheet(false);
  };

  const deleteIngredient = async (id: string) => {
    await db.from('ingredients').delete().eq('id', id);
    setIngredients(prev => prev.filter(i => i.id !== id));
    toast({ title: 'המרכיב נמחק' });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  // ─── Simulation cost ────────────────────────────────────────────────────────
  const simCost = selectedDish ? dishRecipe.reduce((sum, r) => {
    const ing = ingredients.find(i => i.id === r.ingredient_id);
    return sum + (ing ? ing.cost_per_unit * r.quantity : 0);
  }, 0) : 0;
  const simProfit = simPrice - simCost;
  const simMargin = simPrice > 0 ? (simProfit / simPrice) * 100 : 0;

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">עלויות ורווחיות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">חשב את העלות האמיתית של כל מנה</p>
        </div>
        <div className="flex gap-2">
          {tab === 'dishes' && (
            <Button variant="outline" size="sm" onClick={() => setTab('ingredients')}>
              <Package className="w-4 h-4 ml-1" />נהל מרכיבים
            </Button>
          )}
          {tab === 'ingredients' && (
            <Button size="sm" onClick={openCreateIngredient}>
              <Plus className="w-4 h-4 ml-1" />הוסף מרכיב
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{summary.avgMargin.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">מרווח ממוצע</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            <p className="text-xs text-muted-foreground mt-1">מנות עם מתכון</p>
          </div>
          <div className={`bg-card rounded-xl p-4 shadow-sm text-center ${summary.lowMargin > 0 ? 'border border-red-200' : ''}`}>
            <p className={`text-2xl font-bold ${summary.lowMargin > 0 ? 'text-red-600' : 'text-foreground'}`}>{summary.lowMargin}</p>
            <p className="text-xs text-muted-foreground mt-1">מרווח קריטי (&lt;30%)</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm text-center">
            <p className="text-sm font-bold text-green-600 truncate">{summary.bestDish.name_he ?? summary.bestDish.name}</p>
            <p className="text-xs text-muted-foreground mt-1">הכי רווחית ({summary.bestDish.margin.toFixed(0)}%)</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'dishes', label: `מנות (${menuItems.length})`, icon: ChefHat },
          { key: 'ingredients', label: `מרכיבים (${ingredients.length})`, icon: Package },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ─── Dishes tab ─── */}
      {tab === 'dishes' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מנה..." className="pr-9" />
            </div>
            <Select value={filterMargin} onValueChange={v => setFilterMargin(v as typeof filterMargin)}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המנות</SelectItem>
                <SelectItem value="low">מרווח נמוך</SelectItem>
                <SelectItem value="medium">מרווח בינוני</SelectItem>
                <SelectItem value="high">מרווח גבוה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredDishes.map(dish => {
              const badge = dish.hasRecipe ? getMarginBadge(dish.margin) : null;
              return (
                <div key={dish.id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{dish.name_he ?? dish.name}</p>
                        {badge && (
                          <Badge variant="outline" className={`text-xs ${badge.color}`}>{badge.label}</Badge>
                        )}
                        {!dish.hasRecipe && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">ללא מתכון</Badge>
                        )}
                      </div>

                      {dish.hasRecipe ? (
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">עלות: ₪{dish.cost.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">מחיר: ₪{dish.price}</span>
                          <span className="text-xs font-medium text-foreground">רווח: ₪{dish.profit.toFixed(2)}</span>
                          <span className={`text-xs font-bold ${getMarginColor(dish.margin)}`}>
                            מרווח: {dish.margin.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">מחיר: ₪{dish.price} · לחץ להוסיף מתכון</p>
                      )}
                    </div>

                    <Button size="sm" variant="outline" onClick={() => openRecipe(dish)}>
                      <Calculator className="w-3.5 h-3.5 ml-1" />
                      {dish.hasRecipe ? 'ערוך' : 'הגדר מתכון'}
                    </Button>
                  </div>

                  {/* Progress bar למרווח */}
                  {dish.hasRecipe && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            dish.margin >= 60 ? 'bg-green-500' :
                            dish.margin >= 40 ? 'bg-yellow-500' :
                            dish.margin >= 20 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(dish.margin, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Ingredients tab ─── */}
      {tab === 'ingredients' && (
        <div className="space-y-2">
          {ingredients.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין מרכיבים. הוסף מרכיב ראשון.</p>
              <Button size="sm" className="mt-3" onClick={openCreateIngredient}>
                <Plus className="w-4 h-4 ml-1" />הוסף מרכיב
              </Button>
            </div>
          ) : (
            ingredients.map(ing => {
              const supplierName = suppliers.find(s => s.id === ing.supplier_id)?.name;
              const usedIn = recipes.filter(r => r.ingredient_id === ing.id).length;
              return (
                <div key={ing.id} className="bg-card rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{ing.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">₪{ing.cost_per_unit} / {ing.unit}</span>
                      {supplierName && <span className="text-xs text-muted-foreground">ספק: {supplierName}</span>}
                      {usedIn > 0 && <span className="text-xs text-muted-foreground">משמש ב-{usedIn} מנות</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditIngredient(ing)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>למחוק {ing.name}?</AlertDialogTitle>
                        <AlertDialogDescription>יוסר גם מכל המתכונים.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteIngredient(ing.id)}>מחק</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Recipe Sheet ─── */}
      <Sheet open={recipeSheet} onOpenChange={setRecipeSheet}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>מתכון — {selectedDish?.name_he ?? selectedDish?.name}</SheetTitle>
          </SheetHeader>

          {/* Simulation */}
          <div className="mt-4 bg-muted/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">סימולטור מחיר</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">מחיר מכירה (₪)</Label>
                <Input type="number" value={simPrice} onChange={e => setSimPrice(+e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">עלות חומרי גלם</Label>
                <p className="text-sm font-bold text-foreground mt-1.5">₪{simCost.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card rounded-lg p-2">
                <p className="text-xs text-muted-foreground">רווח</p>
                <p className={`text-sm font-bold ${simProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₪{simProfit.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-lg p-2">
                <p className="text-xs text-muted-foreground">מרווח</p>
                <p className={`text-sm font-bold ${getMarginColor(simMargin)}`}>{simMargin.toFixed(1)}%</p>
              </div>
              <div className="bg-card rounded-lg p-2">
                <p className="text-xs text-muted-foreground">סטטוס</p>
                <p className="text-xs font-bold">{getMarginBadge(simMargin).label}</p>
              </div>
            </div>
          </div>

          {/* Recipe rows */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">מרכיבים</p>
              <Button size="sm" variant="outline" onClick={addIngredientToRecipe} disabled={ingredients.length === 0}>
                <Plus className="w-3.5 h-3.5 ml-1" />הוסף מרכיב
              </Button>
            </div>

            {ingredients.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                ⚠️ עליך להוסיף מרכיבים לפני שניתן להגדיר מתכון
              </div>
            )}

            {dishRecipe.length === 0 && ingredients.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">לחץ "הוסף מרכיב" כדי להתחיל</p>
            )}

            {dishRecipe.map((row, idx) => {
              const ing = ingredients.find(i => i.id === row.ingredient_id);
              const rowCost = ing ? ing.cost_per_unit * row.quantity : 0;
              return (
                <div key={row.id} className="bg-muted/20 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">מרכיב</Label>
                      <Select
                        value={row.ingredient_id}
                        onValueChange={v => setDishRecipe(prev => prev.map((r, i) => i === idx ? { ...r, ingredient_id: v } : r))}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ingredients.map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name} (₪{i.cost_per_unit}/{i.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">כמות ({ing?.unit ?? ''})</Label>
                      <Input
                        type="number" min={0} step={0.1}
                        value={row.quantity}
                        onChange={e => setDishRecipe(prev => prev.map((r, i) => i === idx ? { ...r, quantity: +e.target.value } : r))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="mt-5 text-destructive h-8 w-8"
                      onClick={() => setDishRecipe(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    עלות שורה: ₪{rowCost.toFixed(2)}
                    {ing && ` (${row.quantity} × ₪${ing.cost_per_unit})`}
                  </p>
                </div>
              );
            })}

            {dishRecipe.length > 0 && (
              <div className="bg-card rounded-xl p-3 flex justify-between items-center border">
                <span className="text-sm font-semibold">סה"כ עלות</span>
                <span className="text-lg font-bold text-foreground">₪{simCost.toFixed(2)}</span>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRecipeSheet(false)}>ביטול</Button>
            <Button onClick={saveRecipe} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
              שמור מתכון
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Ingredient Sheet ─── */}
      <Sheet open={ingredientSheet} onOpenChange={setIngredientSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editingIngredient ? 'עריכת מרכיב' : 'הוספת מרכיב'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>שם המרכיב *</Label>
              <Input value={ingredientForm.name} onChange={e => setIngredientForm(f => ({ ...f, name: e.target.value }))} placeholder="עגבנייה, שמן זית, קמח..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>יחידת מידה</Label>
                <Select value={ingredientForm.unit} onValueChange={v => setIngredientForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>עלות ליחידה (₪)</Label>
                <Input type="number" min={0} step={0.01} value={ingredientForm.cost_per_unit}
                  onChange={e => setIngredientForm(f => ({ ...f, cost_per_unit: +e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>ספק (אופציונלי)</Label>
              <Select value={ingredientForm.supplier_id || 'none'} onValueChange={v => setIngredientForm(f => ({ ...f, supplier_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="בחר ספק..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא ספק</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              💡 לדוגמה: עגבנייה · גרם · ₪0.008 (כלומר ₪8 לק"ג)
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setIngredientSheet(false)}>ביטול</Button>
            <Button onClick={saveIngredient} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
              {editingIngredient ? 'עדכן' : 'הוסף'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminCosting;