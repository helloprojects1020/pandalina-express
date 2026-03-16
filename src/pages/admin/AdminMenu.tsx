import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { uploadMenuImage, deleteMenuImage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Loader2, ImageIcon, X } from 'lucide-react';

type Category = {
  id: string;
  slug: string;
  name_he: string;
  name_ar: string | null;
  name_en: string | null;
  name_ru: string | null;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  description_ru: string | null;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty: Omit<Category, 'id'> = {
  slug: '', name_he: '', name_ar: '', name_en: '', name_ru: '',
  description_he: '', description_ar: '', description_en: '', description_ru: '',
  image_url: null, video_url: null, sort_order: 0, is_active: true,
};

const AdminMenu = () => {
  const { restaurantId, loading: ridLoading } = useRestaurantId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order');
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: categories.length });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ ...cat });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !form.name_he || !form.slug) {
      toast({ title: 'Missing fields', description: 'Name (Hebrew) and slug are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let image_url = form.image_url;
    if (imageFile) {
      const url = await uploadMenuImage(imageFile, 'categories');
      if (url) image_url = url;
    }

    const payload = { ...form, image_url, restaurant_id: restaurantId };

    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Category updated' });
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Category created' });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category and all its items?')) return;
    await supabase.from('categories').delete().eq('id', id);
    toast({ title: 'Category deleted' });
    fetchCategories();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('categories').update({ is_active: active }).eq('id', id);
    fetchCategories();
  };

  if (ridLoading || loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!restaurantId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <p className="text-muted-foreground">No restaurant found. Please seed the database first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Category</Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground">No categories yet. Click "Add Category" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4">
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
                <p className="text-xs text-muted-foreground">{cat.name_en} · /{cat.slug}</p>
              </div>
              <Switch checked={cat.is_active} onCheckedChange={(v) => handleToggle(cat.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (Hebrew) *</Label>
                <Input value={form.name_he} onChange={(e) => setForm(f => ({ ...f, name_he: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. sushi-rolls" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (English)</Label>
                <Input value={form.name_en ?? ''} onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Name (Arabic)</Label>
                <Input value={form.name_ar ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (Russian)</Label>
                <Input value={form.name_ru ?? ''} onChange={(e) => setForm(f => ({ ...f, name_ru: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description (Hebrew)</Label>
              <Input value={form.description_he ?? ''} onChange={(e) => setForm(f => ({ ...f, description_he: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description (English)</Label>
              <Input value={form.description_en ?? ''} onChange={(e) => setForm(f => ({ ...f, description_en: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Image</Label>
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
                        <AlertDialogTitle>Remove image?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The uploaded image will be deleted. The public site will fall back to the default image for this category.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            await deleteMenuImage(form.image_url!);
                            setForm(f => ({ ...f, image_url: null }));
                          }}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Video URL (optional)</Label>
              <Input value={form.video_url ?? ''} onChange={(e) => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="/videos/category-sushi.mp4" />
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

export default AdminMenu;
