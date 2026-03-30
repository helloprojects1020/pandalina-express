import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemRef = { id: string; name_he: string };

type OptionGroup = {
  id: string;
  menu_item_id: string;
  name: string;
  name_he: string | null;
  name_ar: string | null;
  option_type: string | null;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
};

type OptionValue = {
  id: string;
  option_id: string;
  name: string;
  name_he: string | null;
  name_ar: string | null;
  price_modifier: number;
  sort_order: number;
  is_active: boolean;
};

// ─── Empty forms ──────────────────────────────────────────────────────────────

const emptyGroup = {
  menu_item_id: '',
  name: '',
  name_he: '',
  name_ar: '',
  option_type: 'single',
  is_required: false,
  min_select: 0,
  max_select: 1,
  sort_order: 0,
  is_active: true,
};

const emptyValue = {
  option_id: '',
  name: '',
  name_he: '',
  name_ar: '',
  price_modifier: 0,
  sort_order: 0,
  is_active: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminOptions = () => {
  const { restaurantId } = useAuth();

  const [menuItems, setMenuItems] = useState<ItemRef[]>([]);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [values, setValues] = useState<OptionValue[]>([]);
  const [filterItem, setFilterItem] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Group sheet
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [savingGroup, setSavingGroup] = useState(false);

  // Value sheet
  const [valueSheetOpen, setValueSheetOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<OptionValue | null>(null);
  const [valueForm, setValueForm] = useState(emptyValue);
  const [savingValue, setSavingValue] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [itemRes, groupRes, valueRes] = await Promise.all([
      db.from('menu_items')
        .select('id, name_he')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order'),
      db.from('menu_item_options')
        .select('*')
        .order('sort_order'),
      db.from('menu_item_option_values')
        .select('*')
        .order('sort_order'),
    ]);
    setMenuItems((itemRes.data as ItemRef[]) ?? []);
    setGroups((groupRes.data as OptionGroup[]) ?? []);
    setValues((valueRes.data as OptionValue[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getItemName = (id: string) => menuItems.find(i => i.id === id)?.name_he ?? '';
  const getGroupValues = (groupId: string) => values.filter(v => v.option_id === groupId);

  const filteredGroups = filterItem === 'all'
    ? groups
    : groups.filter(g => g.menu_item_id === filterItem);

    const toggleExpand = (id: string) => {
  setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
  };

  // ─── Group CRUD ─────────────────────────────────────────────────────────────

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      ...emptyGroup,
      menu_item_id: filterItem !== 'all' ? filterItem : (menuItems[0]?.id ?? ''),
      sort_order: groups.length,
    });
    setGroupSheetOpen(true);
  };

  const openEditGroup = (g: OptionGroup) => {
    setEditingGroup(g);
    setGroupForm({
      menu_item_id: g.menu_item_id,
      name: g.name,
      name_he: g.name_he ?? '',
      name_ar: g.name_ar ?? '',
      option_type: g.option_type ?? 'single',
      is_required: g.is_required,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
      is_active: g.is_active,
    });
    setGroupSheetOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.menu_item_id || !groupForm.name_he) {
      toast({ title: 'שדות חסרים', description: 'מנה ושם הקבוצה הם שדות חובה', variant: 'destructive' });
      return;
    }
    setSavingGroup(true);
    const payload = {
      ...groupForm,
      name: groupForm.name_he, // name = Hebrew as base
    };
    if (editingGroup) {
      const { error } = await db.from('menu_item_options').update(payload).eq('id', editingGroup.id);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSavingGroup(false); return; }
      toast({ title: 'קבוצה עודכנה ✅' });
    } else {
      const { error } = await db.from('menu_item_options').insert(payload);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSavingGroup(false); return; }
      toast({ title: 'קבוצה נוצרה ✅' });
    }
    setSavingGroup(false);
    setGroupSheetOpen(false);
    fetchData();
  };

  const handleDeleteGroup = async (id: string) => {
    // מחק ערכים קודם
    await db.from('menu_item_option_values').delete().eq('option_id', id);
    await db.from('menu_item_options').delete().eq('id', id);
    toast({ title: 'קבוצה נמחקה' });
    fetchData();
  };

  const handleToggleGroup = async (id: string, active: boolean) => {
    await db.from('menu_item_options').update({ is_active: active }).eq('id', id);
    setGroups(prev => prev.map(g => g.id === id ? { ...g, is_active: active } : g));
  };

  // ─── Value CRUD ─────────────────────────────────────────────────────────────

  const openCreateValue = (groupId: string) => {
    setEditingValue(null);
    setValueForm({
      ...emptyValue,
      option_id: groupId,
      sort_order: getGroupValues(groupId).length,
    });
    setValueSheetOpen(true);
  };

  const openEditValue = (v: OptionValue) => {
    setEditingValue(v);
    setValueForm({
      option_id: v.option_id,
      name: v.name,
      name_he: v.name_he ?? '',
      name_ar: v.name_ar ?? '',
      price_modifier: v.price_modifier,
      sort_order: v.sort_order,
      is_active: v.is_active,
    });
    setValueSheetOpen(true);
  };

  const handleSaveValue = async () => {
    if (!valueForm.name_he) {
      toast({ title: 'שם הערך הוא שדה חובה', variant: 'destructive' });
      return;
    }
    setSavingValue(true);
    const payload = {
      ...valueForm,
      name: valueForm.name_he,
    };
    if (editingValue) {
      const { error } = await db.from('menu_item_option_values').update(payload).eq('id', editingValue.id);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSavingValue(false); return; }
      toast({ title: 'ערך עודכן ✅' });
    } else {
      const { error } = await db.from('menu_item_option_values').insert(payload);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSavingValue(false); return; }
      toast({ title: 'ערך נוצר ✅' });
    }
    setSavingValue(false);
    setValueSheetOpen(false);
    fetchData();
  };

  const handleDeleteValue = async (id: string) => {
    await db.from('menu_item_option_values').delete().eq('id', id);
    toast({ title: 'ערך נמחק' });
    fetchData();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!restaurantId || loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">ניהול תוספות</h1>
        <div className="flex gap-2">
          <Select value={filterItem} onValueChange={setFilterItem}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="כל המנות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המנות</SelectItem>
              {menuItems.map(i => (
                <SelectItem key={i.id} value={i.id}>{i.name_he}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateGroup} size="sm">
            <Plus className="w-4 h-4 ml-1" /> הוסף קבוצה
          </Button>
        </div>
      </div>

      {/* Groups list */}
      {filteredGroups.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
          <p className="text-muted-foreground">אין תוספות. הוסף קבוצה ראשונה.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const groupValues = getGroupValues(group.id);
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="bg-card rounded-xl shadow-sm overflow-hidden">

                {/* Group header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => toggleExpand(group.id)}
                    className="flex-1 flex items-center gap-3 text-start"
                  >
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {group.name_he ?? group.name}
                        {group.is_required && <span className="text-primary mr-1 text-xs">*חובה</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getItemName(group.menu_item_id)} · {groupValues.length} ערכים · {group.option_type === 'single' ? 'בחירה אחת' : 'בחירה מרובה'}
                      </p>
                    </div>
                  </button>
                  <Switch
                    checked={group.is_active === true}
                    onCheckedChange={(v) => handleToggleGroup(group.id, v)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEditGroup(group)}>
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
                        <AlertDialogTitle>למחוק קבוצה?</AlertDialogTitle>
                        <AlertDialogDescription>
                          כל הערכים בקבוצה זו יימחקו גם כן. פעולה זו לא ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Values (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                    {groupValues.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">אין ערכים עדיין</p>
                    ) : (
                      groupValues.map(val => (
                        <div key={val.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{val.name_he ?? val.name}</p>
                            {val.price_modifier > 0 && (
                              <p className="text-xs text-muted-foreground">+₪{val.price_modifier}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditValue(val)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>למחוק ערך?</AlertDialogTitle>
                                <AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ביטול</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteValue(val.id)}
                                >
                                  מחק
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => openCreateValue(group.id)}
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" /> הוסף ערך
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Group Sheet ── */}
      <Sheet open={groupSheetOpen} onOpenChange={setGroupSheetOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editingGroup ? 'עריכת קבוצה' : 'קבוצה חדשה'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Menu item */}
            <div className="space-y-1">
              <Label>מנה *</Label>
              <Select value={groupForm.menu_item_id} onValueChange={(v) => setGroupForm(f => ({ ...f, menu_item_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {menuItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name_he}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם הקבוצה (עברית) *</Label>
                <Input value={groupForm.name_he} onChange={e => setGroupForm(f => ({ ...f, name_he: e.target.value }))} placeholder="תוספות" />
              </div>
              <div className="space-y-1">
                <Label>שם הקבוצה (ערבית)</Label>
                <Input value={groupForm.name_ar ?? ''} onChange={e => setGroupForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
            </div>

            {/* Type + Required */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>סוג בחירה</Label>
                <Select value={groupForm.option_type ?? 'single'} onValueChange={(v) => setGroupForm(f => ({ ...f, option_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">בחירה אחת</SelectItem>
                    <SelectItem value="multiple">בחירה מרובה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>מינימום / מקסימום</Label>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={groupForm.min_select} onChange={e => setGroupForm(f => ({ ...f, min_select: +e.target.value }))} placeholder="מינ'" />
                  <Input type="number" min={1} value={groupForm.max_select} onChange={e => setGroupForm(f => ({ ...f, max_select: +e.target.value }))} placeholder="מקס'" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={groupForm.is_required} onCheckedChange={v => setGroupForm(f => ({ ...f, is_required: v }))} />
              <Label>שדה חובה</Label>
            </div>

            <div className="space-y-1">
              <Label>סדר תצוגה</Label>
              <Input type="number" min={0} value={groupForm.sort_order} onChange={e => setGroupForm(f => ({ ...f, sort_order: +e.target.value }))} />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setGroupSheetOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveGroup} disabled={savingGroup}>
              {savingGroup && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
              {editingGroup ? 'עדכן' : 'צור'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Value Sheet ── */}
      <Sheet open={valueSheetOpen} onOpenChange={setValueSheetOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editingValue ? 'עריכת ערך' : 'ערך חדש'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם (עברית) *</Label>
                <Input value={valueForm.name_he} onChange={e => setValueForm(f => ({ ...f, name_he: e.target.value }))} placeholder="ללא גלוטן" />
              </div>
              <div className="space-y-1">
                <Label>שם (ערבית)</Label>
                <Input value={valueForm.name_ar ?? ''} onChange={e => setValueForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>תוספת מחיר (₪)</Label>
                <Input type="number" min={0} value={valueForm.price_modifier} onChange={e => setValueForm(f => ({ ...f, price_modifier: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>סדר תצוגה</Label>
                <Input type="number" min={0} value={valueForm.sort_order} onChange={e => setValueForm(f => ({ ...f, sort_order: +e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={valueForm.is_active === true} onCheckedChange={v => setValueForm(f => ({ ...f, is_active: v }))} />
              <Label>פעיל</Label>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setValueSheetOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveValue} disabled={savingValue}>
              {savingValue && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}
              {editingValue ? 'עדכן' : 'צור'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminOptions;