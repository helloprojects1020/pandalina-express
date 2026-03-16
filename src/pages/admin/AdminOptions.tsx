import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useRestaurantId } from '@/hooks/useRestaurantId';

type OptionRow = {
  id: string;
  menu_item_id: string;
  group_name_he: string;
  group_name_en: string | null;
  group_name_ar: string | null;
  group_name_ru: string | null;
  option_name_he: string;
  option_name_en: string | null;
  option_name_ar: string | null;
  option_name_ru: string | null;
  price_add: number;
  is_default: boolean;
  sort_order: number;
};

type ItemRef = { id: string; name_he: string };

const emptyOpt = {
  menu_item_id: '', group_name_he: '', group_name_en: '', group_name_ar: '', group_name_ru: '',
  option_name_he: '', option_name_en: '', option_name_ar: '', option_name_ru: '',
  price_add: 0, is_default: false, sort_order: 0,
};

const AdminOptions = () => {
  const { restaurantId, loading: ridLoading } = useRestaurantId();
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [menuItems, setMenuItems] = useState<ItemRef[]>([]);
  const [filterItem, setFilterItem] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OptionRow | null>(null);
  const [form, setForm] = useState(emptyOpt);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [itemRes, optRes] = await Promise.all([
      supabase.from('menu_items').select('id, name_he').eq('restaurant_id', restaurantId).order('name_he'),
      supabase.from('menu_item_options').select('*').order('sort_order'),
    ]);
    setMenuItems((itemRes.data as ItemRef[]) ?? []);
    setOptions((optRes.data as OptionRow[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterItem === 'all' ? options : options.filter(o => o.menu_item_id === filterItem);
  const getItemName = (id: string) => menuItems.find(i => i.id === id)?.name_he ?? '';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyOpt, menu_item_id: filterItem !== 'all' ? filterItem : (menuItems[0]?.id ?? '') });
    setDialogOpen(true);
  };

  const openEdit = (opt: OptionRow) => {
    setEditing(opt);
    setForm({
      menu_item_id: opt.menu_item_id, group_name_he: opt.group_name_he,
      group_name_en: opt.group_name_en ?? '', group_name_ar: opt.group_name_ar ?? '', group_name_ru: opt.group_name_ru ?? '',
      option_name_he: opt.option_name_he, option_name_en: opt.option_name_en ?? '',
      option_name_ar: opt.option_name_ar ?? '', option_name_ru: opt.option_name_ru ?? '',
      price_add: opt.price_add, is_default: opt.is_default, sort_order: opt.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.menu_item_id || !form.group_name_he || !form.option_name_he) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('menu_item_options').update(form).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Option updated' });
    } else {
      const { error } = await supabase.from('menu_item_options').insert(form);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Option created' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this option?')) return;
    await supabase.from('menu_item_options').delete().eq('id', id);
    fetchData();
  };

  if (ridLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Item Options / Modifiers</h1>
        <div className="flex gap-2">
          <Select value={filterItem} onValueChange={setFilterItem}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All items" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {menuItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name_he}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Option</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground">No options yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((opt) => (
            <div key={opt.id} className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{opt.group_name_he}: {opt.option_name_he}</p>
                <p className="text-xs text-muted-foreground">{getItemName(opt.menu_item_id)} · +₪{opt.price_add}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(opt)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(opt.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Option' : 'New Option'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Menu Item *</Label>
              <Select value={form.menu_item_id} onValueChange={(v) => setForm(f => ({ ...f, menu_item_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{menuItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name_he}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Group (Hebrew) *</Label><Input value={form.group_name_he} onChange={e => setForm(f => ({ ...f, group_name_he: e.target.value }))} placeholder="e.g. תוספות" /></div>
              <div className="space-y-1"><Label>Group (English)</Label><Input value={form.group_name_en ?? ''} onChange={e => setForm(f => ({ ...f, group_name_en: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Option (Hebrew) *</Label><Input value={form.option_name_he} onChange={e => setForm(f => ({ ...f, option_name_he: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Option (English)</Label><Input value={form.option_name_en ?? ''} onChange={e => setForm(f => ({ ...f, option_name_en: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Price Add (₪)</Label><Input type="number" value={form.price_add} onChange={e => setForm(f => ({ ...f, price_add: +e.target.value }))} /></div>
              <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOptions;
