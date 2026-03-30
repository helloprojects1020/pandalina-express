import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadMenuImage, deleteMenuImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Loader2, ImageIcon, X } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Category = {
  id: string;
  slug: string;
  name: string;
  name_he: string;
  name_ar: string | null;
  name_ru: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = {
  slug: '',
  name_he: '',
  name_ar: '',
  name_ru: '',
  image_url: null as string | null,
  sort_order: 0,
  is_active: true,
};

const COLS = 'id, slug, name, name_he, name_ar, name_ru, image_url, sort_order, is_active';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norm = (c: any): Category => ({ ...c, is_active: c.is_active === true });

const AdminMenu = () => {
  const { restaurantId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    db.from('categories')
      .select(COLS)
      .eq('restaurant_id', restaurantId)
      .order('sort_order')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] }) => {
        setCategories((data ?? []).map(norm));
        setLoading(false);
      });
  }, [restaurantId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: categories.length });
    setImageFile(null);
    setSheetOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      slug: cat.slug,
      name_he: cat.name_he ?? '',
      name_ar: cat.name_ar ?? '',
      name_ru: cat.name_ru ?? '',
      image_url: cat.image_url,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setImageFile(null);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !form.name_he) {
      toast({ title: 'שם בעברית הוא שדה חובה', variant: 'destructive' });
      return;
    }

    const slug = form.slug.trim() || form.name_he
      .trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0590-\u05FF-]/g, '')
      || `cat-${Date.now()}`;

    setSaving(true);

    let image_url = form.image_url;
    if (imageFile) {
      const url = await uploadMenuImage(imageFile, 'categories');
      if (url) image_url = url;
    }

    const payload = {
      slug,
      name: form.name_he,
      name_he: form.name_he,
      name_ar: form.name_ar || null,
      name_ru: form.name_ru || null,
      image_url,
      sort_order: form.sort_order,
      is_active: form.is_active,
      restaurant_id: restaurantId,
    };

    if (editing) {
      const { data, error } = await db
        .from('categories')
        .update(payload)
        .eq('id', editing.id)
        .select(COLS)
        .single();

      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setCategories(prev => prev.map(c => c.id === editing.id ? norm(data) : c));
      toast({ title: 'קטגוריה עודכנה ✅' });

    } else {
      const { data, error } = await db
        .from('categories')
        .insert(payload)
        .select(COLS)
        .single();

      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setCategories(prev => [...prev, norm(data)]);
      toast({ title: 'קטגוריה נוצרה ✅' });
    }

    setSheetOpen(false);
  };

  const handleDelete = async (id: string) => {
    await db.from('categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
    toast({ title: 'קטגוריה נמחקה' });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await db.from('categories').update({ is_active: active }).eq('id', id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
  };

  if (!restaurantId || loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">ניהול קטגוריות</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 ml-1" /> הוסף קטגוריה
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
          <p className="text-muted-foreground">אין קטגוריות.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card rounded-xl p-4 shadow-sm flex items-center gap-4">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              {cat.image_url ? (
                <img src={cat.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{cat.name_he}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.name_ar && <span className="ml-2">{cat.name_ar}</span>}
                  {cat.name_ru && <span className="ml-2">{cat.name_ru}</span>}
                  · /{cat.slug}
                </p>
              </div>
              <Switch checked={cat.is_active === true} onCheckedChange={(v) => handleToggle(cat.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
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
                    <AlertDialogTitle>למחוק קטגוריה?</AlertDialogTitle>
                    <AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete(cat.id)}
                    >מחק</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editing ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם בעברית *</Label>
                <Input value={form.name_he} onChange={(e) => setForm(f => ({ ...f, name_he: e.target.value }))} placeholder="רולים" />
              </div>
              <div className="space-y-1">
                <Label>Slug (אוטומטי אם ריק)</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="sushi-rolls" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם בערבית</Label>
                <Input value={form.name_ar ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>שם ברוסית</Label>
                <Input value={form.name_ru ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ru: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>סדר תצוגה</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                <Label>פעיל</Label>
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
            <Button variant="outline" onClick={() => setSheetOpen(false)}>ביטול</Button>
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

export default AdminMenu;