import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadMenuImage, deleteMenuImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, ImageIcon, Star, Sparkles, X, UtensilsCrossed } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, LoadingState } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// עמודות קיימות ב-DB:
// name, name_he, name_ar, name_ru
// description, description_he, description_ar, description_ru
// (אין name_en, description_en)

type MenuItemRow = {
  id: string;
  category_id: string;
  slug: string;
  name_he: string;
  name_ar: string | null;
  name_ru: string | null;
  description_he: string | null;
  description_ar: string | null;
  description_ru: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  sort_order: number;
};

type CategoryRow = { id: string; name_he: string; slug: string };

const emptyItem = {
  category_id: '',
  slug: '',
  name_he: '',
  name_ar: '',
  name_ru: '',
  description_he: '',
  description_ar: '',
  description_ru: '',
  price: 0,
  image_url: null as string | null,
  is_active: true,
  is_bestseller: false,
  is_new: false,
  sort_order: 0,
};

// עמודות לשליפה — רק מה שקיים ב-DB
const ITEM_COLS = `
  id, category_id, slug, price, image_url,
  is_active, is_bestseller, sort_order,
  name, name_he, name_ar, name_ru,
  description, description_he, description_ar, description_ru
`;

const AdminMenuItems = () => {
  const { restaurantId } = useAuth();
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([
      db.from('categories').select('id, name_he, slug').eq('restaurant_id', restaurantId).order('sort_order'),
      db.from('menu_items').select(ITEM_COLS).eq('restaurant_id', restaurantId).order('sort_order'),
    ]);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItems(((itemRes.data as any[]) ?? []).map(i => ({
      ...i,
      is_active: i.is_active === true,
      is_bestseller: i.is_bestseller === true,
      is_new: i.is_new === true,
    })));
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category_id === filterCat);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyItem,
      category_id: filterCat !== 'all' ? filterCat : (categories[0]?.id ?? ''),
      sort_order: items.length,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemRow) => {
    setEditing(item);
    setForm({
      category_id: item.category_id,
      slug: item.slug ?? '',
      name_he: item.name_he ?? '',
      name_ar: item.name_ar ?? '',
      name_ru: item.name_ru ?? '',
      description_he: item.description_he ?? '',
      description_ar: item.description_ar ?? '',
      description_ru: item.description_ru ?? '',
      price: item.price,
      image_url: item.image_url,
      is_active: item.is_active,
      is_bestseller: item.is_bestseller,
      is_new: item.is_new ?? false,
      sort_order: item.sort_order,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !form.name_he || !form.category_id) {
      toast({ title: 'שדות חסרים', description: 'שם וקטגוריה הם שדות חובה.', variant: 'destructive' });
      return;
    }

    const slug = form.slug.trim() || form.name_he.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0590-\u05FF-]/g, '')
      || `item-${Date.now()}`;

    setSaving(true);

    let image_url = form.image_url;
    if (imageFile) {
      const url = await uploadMenuImage(imageFile, 'items');
      if (url) image_url = url;
    }

    // payload מכיל רק עמודות שקיימות ב-DB
    const payload = {
      category_id: form.category_id,
      slug,
      name: form.name_he,
      name_he: form.name_he,
      name_ar: form.name_ar || null,
      name_ru: form.name_ru || null,
      description: form.description_he || null,
      description_he: form.description_he || null,
      description_ar: form.description_ar || null,
      description_ru: form.description_ru || null,
      price: form.price,
      image_url,
      is_active: form.is_active,
      is_bestseller: form.is_bestseller,
      sort_order: form.sort_order,
      restaurant_id: restaurantId,
    };

    if (editing) {
      const { data, error } = await db
        .from('menu_items')
        .update(payload)
        .eq('id', editing.id)
        .select(ITEM_COLS)
        .single();

      setSaving(false);
      if (error) {
        toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
        return;
      }
      setItems(prev => prev.map(i => i.id === editing.id ? {
        ...data,
        is_active: data.is_active === true,
        is_bestseller: data.is_bestseller === true,
        is_new: data.is_new === true,
      } : i));
      toast({ title: 'המנה עודכנה ✅' });

    } else {
      const { data, error } = await db
        .from('menu_items')
        .insert(payload)
        .select(ITEM_COLS)
        .single();

      setSaving(false);
      if (error) {
        toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
        return;
      }
      setItems(prev => [...prev, {
        ...data,
        is_active: data.is_active === true,
        is_bestseller: data.is_bestseller === true,
        is_new: data.is_new === true,
      }]);
      toast({ title: 'המנה נוצרה ✅' });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await db.from('menu_items').delete().eq('id', id);
    if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'המנה נמחקה' });
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await db.from('menu_items').update({ is_active: active }).eq('id', id);
    if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: active } : i));
  };

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name_he ?? '';

  if (!restaurantId || loading) return <LoadingState />;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="פריטי תפריט"
        actions={
          <div className="flex gap-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 ml-1" /> הוסף מנה
            </Button>
          </div>
        }
      />

      <SectionCard title="מנות" icon={UtensilsCrossed} noPadding>
      {filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="אין מנות"
          description="הוסף את המנה הראשונה לתפריט"
          action={<Button onClick={openCreate}>הוסף מנה</Button>}
        />
      ) : (
        <div className="space-y-2 p-5">
          {filtered.map((item) => (
            <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm flex items-center gap-4">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm">{item.name_he}</p>
                  {item.is_bestseller && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Star className="w-3 h-3" />הכי נמכר
                    </Badge>
                  )}
                  {item.is_new && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Sparkles className="w-3 h-3" />חדש
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{getCatName(item.category_id)} · ₪{item.price}</p>
              </div>
              <Switch checked={item.is_active === true} onCheckedChange={(v) => handleToggle(item.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
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
                    <AlertDialogTitle>למחוק את המנה?</AlertDialogTitle>
                    <AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete(item.id)}
                    >מחק</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
      </SectionCard>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editing ? 'עריכת מנה' : 'מנה חדשה'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>קטגוריה *</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Slug (אוטומטי אם ריק)</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-item-slug" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם בעברית *</Label>
                <Input value={form.name_he} onChange={(e) => setForm(f => ({ ...f, name_he: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>שם בערבית</Label>
                <Input value={form.name_ar ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>שם ברוסית</Label>
              <Input value={form.name_ru ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ru: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>תיאור בעברית</Label>
              <Textarea value={form.description_he ?? ''} onChange={(e) => setForm(f => ({ ...f, description_he: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>תיאור בערבית</Label>
              <Textarea value={form.description_ar ?? ''} onChange={(e) => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>תיאור ברוסית</Label>
              <Textarea value={form.description_ru ?? ''} onChange={(e) => setForm(f => ({ ...f, description_ru: e.target.value }))} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>מחיר (₪) *</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm(f => ({ ...f, price: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>סדר תצוגה</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
              </div>
              <div className="space-y-3 pt-5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.is_bestseller} onCheckedChange={(v) => setForm(f => ({ ...f, is_bestseller: v }))} />
                  הכי נמכר
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.is_new} onCheckedChange={(v) => setForm(f => ({ ...f, is_new: v }))} />
                  חדש
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>תמונה</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              {form.image_url && !imageFile && (
                <div className="flex items-start gap-2 mt-1">
                  <img src={form.image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>הסר תמונה?</AlertDialogTitle>
                        <AlertDialogDescription>התמונה תימחק. האתר יחזור לתמונת ברירת המחדל.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            await deleteMenuImage(form.image_url!);
                            setForm(f => ({ ...f, image_url: null }));
                          }}
                        >הסר</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
              {editing ? 'עדכן' : 'צור'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminMenuItems;