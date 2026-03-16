import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { uploadMenuImage, deleteMenuImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, ImageIcon, Star, Sparkles } from 'lucide-react';

type MenuItemRow = {
  id: string;
  category_id: string;
  slug: string;
  name_he: string;
  name_ar: string | null;
  name_en: string | null;
  name_ru: string | null;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
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
  category_id: '', slug: '', name_he: '', name_ar: '', name_en: '', name_ru: '',
  description_he: '', description_ar: '', description_en: '', description_ru: '',
  price: 0, image_url: null as string | null, is_active: true, is_bestseller: false, is_new: false, sort_order: 0,
};

const AdminMenuItems = () => {
  const { restaurantId, loading: ridLoading } = useRestaurantId();
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
      supabase.from('categories').select('id, name_he, slug').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
    ]);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setItems((itemRes.data as MenuItemRow[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category_id === filterCat);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyItem, category_id: filterCat !== 'all' ? filterCat : (categories[0]?.id ?? ''), sort_order: items.length });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemRow) => {
    setEditing(item);
    setForm({ ...item, description_he: item.description_he ?? '', description_ar: item.description_ar ?? '', description_en: item.description_en ?? '', description_ru: item.description_ru ?? '', name_ar: item.name_ar ?? '', name_en: item.name_en ?? '', name_ru: item.name_ru ?? '' });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !form.name_he || !form.slug || !form.category_id) {
      toast({ title: 'Missing fields', description: 'Name, slug, and category are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let image_url = form.image_url;
    if (imageFile) {
      const url = await uploadMenuImage(imageFile, 'items');
      if (url) image_url = url;
    }

    const payload = { ...form, image_url, restaurant_id: restaurantId };

    if (editing) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Item updated' });
    } else {
      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Item created' });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    toast({ title: 'Item deleted' });
    fetchData();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('menu_items').update({ is_active: active }).eq('id', id);
    fetchData();
  };

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name_he ?? '';

  if (ridLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Menu Items</h1>
        <div className="flex gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground">No items. Add your first dish.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm">{item.name_he}</p>
                  {item.is_bestseller && <Badge variant="secondary" className="text-xs gap-1"><Star className="w-3 h-3" />Best</Badge>}
                  {item.is_new && <Badge variant="outline" className="text-xs gap-1"><Sparkles className="w-3 h-3" />New</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{getCatName(item.category_id)} · ₪{item.price}</p>
              </div>
              <Switch checked={item.is_active} onCheckedChange={(v) => handleToggle(item.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (Hebrew) *</Label>
                <Input value={form.name_he} onChange={(e) => setForm(f => ({ ...f, name_he: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Name (English)</Label>
                <Input value={form.name_en ?? ''} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (Arabic)</Label>
                <Input value={form.name_ar ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Name (Russian)</Label>
                <Input value={form.name_ru ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ru: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description (Hebrew)</Label>
              <Textarea value={form.description_he ?? ''} onChange={(e) => setForm(f => ({ ...f, description_he: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Description (English)</Label>
              <Textarea value={form.description_en ?? ''} onChange={(e) => setForm(f => ({ ...f, description_en: e.target.value }))} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Price (₪) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
              </div>
              <div className="space-y-3 pt-5">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_bestseller} onCheckedChange={(v) => setForm(f => ({ ...f, is_bestseller: v }))} /> Bestseller</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_new} onCheckedChange={(v) => setForm(f => ({ ...f, is_new: v }))} /> New</label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              {form.image_url && !imageFile && <img src={form.image_url} alt="" className="w-20 h-20 rounded-lg object-cover mt-1" />}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMenuItems;
