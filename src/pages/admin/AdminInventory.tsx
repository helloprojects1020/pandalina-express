import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, AlertTriangle, Search, Truck, ChevronDown, ChevronUp, TrendingUp, TrendingDown, History, ArrowDownCircle } from 'lucide-react';
import { DateRangePicker, DateRange } from '@/components/admin/DateRangePicker';
import { FeatureGate } from '@/components/admin/FeatureGate';
import { PageHeader, KpiCard, SectionCard, EmptyState, LoadingState } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Supplier = { id: string; name: string; phone: string | null; contact_name: string | null; notes: string | null; is_active: boolean; };
type InventoryItem = { id: string; name: string; unit: string; current_stock: number; min_stock: number; cost_price: number; supplier_id: string | null; is_active: boolean; };
type PriceHistory = { id: string; inventory_item_id: string; supplier_id: string | null; old_price: number; new_price: number; changed_at: string; notes: string | null; };
type InventoryMovement = { id: string; inventory_item_id: string; order_id: string | null; menu_item_name: string | null; quantity_used: number; movement_type: string; notes: string | null; created_at: string; };

const UNITS = ['יחידה', 'ק"ג', 'גרם', 'ליטר', 'מ"ל', 'קרטון', 'חבילה', 'שקית', 'בקבוק', 'כוס'];
const emptyItemForm = { name: '', unit: 'יחידה', current_stock: 0, min_stock: 0, cost_price: 0, supplier_id: '', is_active: true, newSupplierName: '' };
const emptySupplierForm = { name: '', phone: '', contact_name: '', notes: '', is_active: true };

const AdminInventory = () => {
  const { restaurantId } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inventory' | 'suppliers' | 'prices' | 'movements'>('inventory');
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [movementDateRange, setMovementDateRange] = useState<DateRange>(null);
  const [priceDateRange, setPriceDateRange] = useState<DateRange>(null);
  const [itemSheet, setItemSheet] = useState(false);
  const [supplierSheet, setSupplierSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [saving, setSaving] = useState(false);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [priceFilterSupplier, setPriceFilterSupplier] = useState<string>('all');

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    Promise.all([
      db.from('inventory_items').select('*').eq('restaurant_id', restaurantId).order('name'),
      db.from('suppliers').select('*').eq('restaurant_id', restaurantId).order('name'),
      db.from('price_history').select('*').eq('restaurant_id', restaurantId).order('changed_at', { ascending: false }),
      db.from('inventory_movements').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([itemsRes, suppliersRes, priceRes, movRes]: any[]) => {
      setItems(itemsRes.data ?? []);
      setSuppliers(suppliersRes.data ?? []);
      setPriceHistory(priceRes.data ?? []);
      setMovements(movRes.data ?? []);
      setLoading(false);
    });
  }, [restaurantId]);

  const lowStockItems = items.filter(i => i.current_stock <= i.min_stock && i.min_stock > 0);
  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchLow = !showLowOnly || (i.current_stock <= i.min_stock && i.min_stock > 0);
    return matchSearch && matchLow;
  });

  // סינון תנועות לפי date range + מוצר
  const filteredMovements = useMemo(() => {
    let result = movements;
    if (movementFilter !== 'all') result = result.filter(m => m.inventory_item_id === movementFilter);
    if (movementDateRange) {
      const from = movementDateRange.from;
      const to = movementDateRange.to + 'T23:59:59';
      result = result.filter(m => m.created_at >= from && m.created_at <= to);
    }
    return result;
  }, [movements, movementFilter, movementDateRange]);

  // סינון היסטוריית מחירים לפי date range + ספק
  const filteredPriceHistory = useMemo(() => {
    let result = priceHistory;
    if (priceFilterSupplier !== 'all') result = result.filter(p => p.supplier_id === priceFilterSupplier);
    if (priceDateRange) {
      const from = priceDateRange.from;
      const to = priceDateRange.to + 'T23:59:59';
      result = result.filter(p => p.changed_at >= from && p.changed_at <= to);
    }
    return result;
  }, [priceHistory, priceFilterSupplier, priceDateRange]);

  // ─── Items ────────────────────────────────────────────────────────────────────
  const openCreateItem = () => { setEditingItem(null); setItemForm(emptyItemForm); setItemSheet(true); };
  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({ name: item.name, unit: item.unit, current_stock: item.current_stock, min_stock: item.min_stock, cost_price: item.cost_price, supplier_id: item.supplier_id ?? '', is_active: item.is_active, newSupplierName: '' });
    setItemSheet(true);
  };

  const saveItem = async () => {
    if (!restaurantId || !itemForm.name) { toast({ title: 'שם המוצר הוא שדה חובה', variant: 'destructive' }); return; }
    setSaving(true);
    let resolvedSupplierId = itemForm.supplier_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formWithNew = itemForm as any;
    if (itemForm.supplier_id === 'new' && formWithNew.newSupplierName?.trim()) {
      const { data: newSupplier, error: supplierError } = await db.from('suppliers').insert({ restaurant_id: restaurantId, name: formWithNew.newSupplierName.trim() }).select('*').single();
      if (supplierError) { setSaving(false); toast({ title: 'שגיאה ביצירת ספק', description: supplierError.message, variant: 'destructive' }); return; }
      setSuppliers(prev => [...prev, newSupplier]);
      resolvedSupplierId = newSupplier.id;
      toast({ title: `ספק "${newSupplier.name}" נוסף ✅` });
    } else if (itemForm.supplier_id === 'new') { resolvedSupplierId = ''; }

    const payload = { name: itemForm.name, unit: itemForm.unit, current_stock: itemForm.current_stock, min_stock: itemForm.min_stock, cost_price: itemForm.cost_price, is_active: itemForm.is_active, restaurant_id: restaurantId, supplier_id: resolvedSupplierId || null, updated_at: new Date().toISOString() };

    if (editingItem) {
      const oldPrice = editingItem.cost_price; const newPrice = itemForm.cost_price; const priceChanged = oldPrice !== newPrice && newPrice > 0;
      const { data, error } = await db.from('inventory_items').update(payload).eq('id', editingItem.id).select('*').single();
      if (error) { setSaving(false); toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      if (priceChanged && oldPrice > 0) {
        const { data: histData } = await db.from('price_history').insert({ restaurant_id: restaurantId, inventory_item_id: editingItem.id, supplier_id: itemForm.supplier_id || editingItem.supplier_id || null, old_price: oldPrice, new_price: newPrice }).select('*').single();
        if (histData) setPriceHistory(prev => [histData, ...prev]);
        const pct = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);
        toast({ title: `מחיר ${data.name} ${newPrice > oldPrice ? `עלה ב-${pct}%` : `ירד ב-${Math.abs(Number(pct))}%`} 📊` });
      } else { toast({ title: 'המוצר עודכן ✅' }); }
      setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
    } else {
      const { data, error } = await db.from('inventory_items').insert(payload).select('*').single();
      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setItems(prev => [...prev, data]);
      toast({ title: 'המוצר נוסף ✅' });
    }
    setSaving(false); setItemSheet(false);
  };

  const deleteItem = async (id: string) => { await db.from('inventory_items').delete().eq('id', id); setItems(prev => prev.filter(i => i.id !== id)); toast({ title: 'המוצר נמחק' }); };
  const updateStock = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id); if (!item) return;
    const newStock = Math.max(0, item.current_stock + delta);
    await db.from('inventory_items').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, current_stock: newStock } : i));
  };
  const setStockDirect = async (id: string, value: number) => {
    const newStock = Math.max(0, value);
    await db.from('inventory_items').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, current_stock: newStock } : i));
    setStockDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // ─── Suppliers ────────────────────────────────────────────────────────────────
  const openCreateSupplier = () => { setEditingSupplier(null); setSupplierForm(emptySupplierForm); setSupplierSheet(true); };
  const openEditSupplier = (s: Supplier) => { setEditingSupplier(s); setSupplierForm({ name: s.name, phone: s.phone ?? '', contact_name: s.contact_name ?? '', notes: s.notes ?? '', is_active: s.is_active }); setSupplierSheet(true); };
  const saveSupplier = async () => {
    if (!restaurantId || !supplierForm.name) { toast({ title: 'שם הספק הוא שדה חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...supplierForm, restaurant_id: restaurantId };
    if (editingSupplier) {
      const { data, error } = await db.from('suppliers').update(payload).eq('id', editingSupplier.id).select('*').single();
      setSaving(false); if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? data : s)); toast({ title: 'הספק עודכן ✅' });
    } else {
      const { data, error } = await db.from('suppliers').insert(payload).select('*').single();
      setSaving(false); if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setSuppliers(prev => [...prev, data]); toast({ title: 'הספק נוסף ✅' });
    }
    setSupplierSheet(false);
  };
  const deleteSupplier = async (id: string) => { await db.from('suppliers').delete().eq('id', id); setSuppliers(prev => prev.filter(s => s.id !== id)); toast({ title: 'הספק נמחק' }); };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return <LoadingState />;

  const totalUsed = filteredMovements.reduce((s, m) => s + Number(m.quantity_used), 0);
  const topItems = items.map(item => ({ ...item, totalUsed: movements.filter(m => m.inventory_item_id === item.id).reduce((s, m) => s + Number(m.quantity_used), 0) })).sort((a, b) => b.totalUsed - a.totalUsed).slice(0, 5);
  const outOfStockItems = items.filter(i => i.current_stock === 0);
  const healthyItems = items.filter(i => i.min_stock === 0 || i.current_stock > i.min_stock);

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="ניהול מלאי"
        description={`${items.length} מוצרים · ${suppliers.length} ספקים`}
        actions={tab !== 'prices' && tab !== 'movements' ? (
          <Button onClick={tab === 'inventory' ? openCreateItem : openCreateSupplier} size="sm">
            <Plus className="w-4 h-4 ml-1" />{tab === 'inventory' ? 'הוסף מוצר' : 'הוסף ספק'}
          </Button>
        ) : undefined}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label='סה"כ מוצרים' value={items.length} icon={Package} accent="#3b82f6" />
        <KpiCard label="מלאי תקין" value={healthyItems.length} icon={TrendingUp} accent="#10b981" />
        <KpiCard label="מלאי נמוך" value={lowStockItems.length} icon={AlertTriangle} accent={lowStockItems.length > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="אזל מהמלאי" value={outOfStockItems.length} icon={TrendingDown} accent={outOfStockItems.length > 0 ? '#ef4444' : '#6b7280'} />
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-amber-500/8 border border-amber-400/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="font-bold text-sm text-amber-800">{lowStockItems.length} מוצרים דורשים תשומת לב</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStockItems.map(item => (
              <span key={item.id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.current_stock === 0 ? 'bg-red-500/10 text-red-700 border border-red-200' : 'bg-amber-500/10 text-amber-700 border border-amber-200'}`}>
                {item.name} — {item.current_stock} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[{ key: 'inventory', label: `מוצרים (${items.length})`, icon: Package }, { key: 'suppliers', label: `ספקים (${suppliers.length})`, icon: Truck }, { key: 'movements', label: `תנועות (${filteredMovements.length})`, icon: ArrowDownCircle }, { key: 'prices', label: `מחירים (${filteredPriceHistory.length})`, icon: History }]
          .map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
      </div>

      {/* ─── Inventory tab ─── */}
      {tab === 'inventory' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מוצר..." className="pr-9" /></div>
            <Button variant={showLowOnly ? 'default' : 'outline'} size="sm" onClick={() => setShowLowOnly(v => !v)} className={showLowOnly ? 'bg-red-600 hover:bg-red-700' : ''}><AlertTriangle className="w-4 h-4 ml-1" />נמוך בלבד</Button>
          </div>
          {filteredItems.length === 0 ? <div className="bg-card rounded-2xl p-8 shadow-sm text-center"><Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground">אין מוצרים.</p></div> : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const isLow = item.min_stock > 0 && item.current_stock <= item.min_stock;
                const supplierName = suppliers.find(s => s.id === item.supplier_id)?.name;
                const itemHistory = priceHistory.filter(p => p.inventory_item_id === item.id);
                const priceTrend = itemHistory[0] ? itemHistory[0].new_price - itemHistory[0].old_price : 0;
                const totalUsedItem = movements.filter(m => m.inventory_item_id === item.id).reduce((s, m) => s + Number(m.quantity_used), 0);
                const isExhausted   = item.current_stock === 0;
                const isNearlyEmpty = item.current_stock > 0 && item.current_stock < 5;
                const rowBorder = isExhausted ? 'border border-red-200' : isLow ? 'border border-orange-200' : '';
                return (
                  <div key={item.id} className={`bg-card rounded-xl p-4 shadow-sm flex items-center gap-3 ${rowBorder}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExhausted ? 'bg-red-500/10' : isLow ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
                      <Package className={`w-5 h-5 ${isExhausted ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{item.name}</p>
                        {isExhausted   && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-200">אזל מהמלאי</Badge>}
                        {isNearlyEmpty && <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 border-orange-200">כמעט אזל</Badge>}
                        {isLow && !isExhausted && !isNearlyEmpty && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-200">מלאי נמוך</Badge>}
                        {priceTrend !== 0 && <span className={`text-xs flex items-center gap-0.5 ${priceTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>{priceTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{priceTrend > 0 ? '+' : ''}₪{priceTrend.toFixed(1)}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">מינימום: {item.min_stock} {item.unit}</span>
                        {item.cost_price > 0 && <span className="text-xs text-muted-foreground">עלות: ₪{item.cost_price}</span>}
                        {supplierName && <span className="text-xs text-muted-foreground">ספק: {supplierName}</span>}
                        {totalUsedItem > 0 && <span className="text-xs text-orange-600">נצרך: {totalUsedItem.toFixed(1)} {item.unit}</span>}
                      </div>
                    </div>

                    {/* Stock controls: inline input + quick presets */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <input
                        type="number"
                        min="0"
                        value={stockDraft[item.id] ?? item.current_stock}
                        onChange={e => setStockDraft(prev => ({ ...prev, [item.id]: Math.max(0, Number(e.target.value)) }))}
                        onBlur={() => {
                          const draft = stockDraft[item.id];
                          if (draft !== undefined && draft !== item.current_stock) setStockDirect(item.id, draft);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') { setStockDirect(item.id, stockDraft[item.id] ?? item.current_stock); (e.target as HTMLInputElement).blur(); } }}
                        className={`w-16 h-8 text-center text-sm font-bold rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                          isExhausted ? 'text-red-600 border-red-300' : isLow ? 'text-orange-600 border-orange-200' : 'text-foreground border-border'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">{item.unit}</span>
                      {[0, 10, 50].map(preset => (
                        <button
                          key={preset}
                          onClick={() => setStockDirect(item.id, preset)}
                          className="h-7 px-1.5 text-xs rounded-md bg-muted hover:bg-muted/70 text-muted-foreground font-medium transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>למחוק {item.name}?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteItem(item.id)}>מחק</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Movements tab ─── */}
      {tab === 'movements' && (
        <div className="space-y-4">
          {/* פילטרים */}
          <div className="flex gap-2 flex-wrap">
            <DateRangePicker value={movementDateRange} onChange={setMovementDateRange} />
            <Select value={movementFilter} onValueChange={setMovementFilter}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="כל המוצרים" /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל המוצרים</SelectItem>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {movementDateRange && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
              {new Date(movementDateRange.from).toLocaleDateString('he-IL')} — {new Date(movementDateRange.to).toLocaleDateString('he-IL')} · {filteredMovements.length} תנועות
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-foreground">{filteredMovements.length}</p><p className="text-xs text-muted-foreground mt-1">סה"כ תנועות</p></div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-orange-600">{totalUsed.toFixed(1)}</p><p className="text-xs text-muted-foreground mt-1">כמות כוללת</p></div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center col-span-2">
              <p className="text-sm font-semibold text-foreground mb-1">הכי נצרך</p>
              <div className="flex flex-wrap gap-1 justify-center">{topItems.slice(0, 3).map(i => <span key={i.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{i.name} ({i.totalUsed.toFixed(1)} {i.unit})</span>)}</div>
            </div>
          </div>

          {topItems.length > 0 && (
            <SectionCard title="צריכה לפי מוצר" icon={TrendingDown}>
              <div className="space-y-2">{topItems.filter(i => i.totalUsed > 0).map(item => {
                const maxUsed = topItems[0].totalUsed || 1;
                return (<div key={item.id} className="flex items-center gap-3"><span className="text-xs text-foreground w-24 truncate shrink-0">{item.name}</span><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${(item.totalUsed / maxUsed) * 100}%` }} /></div><span className="text-xs text-muted-foreground shrink-0">{item.totalUsed.toFixed(1)} {item.unit}</span></div>);
              })}</div>
            </SectionCard>
          )}

          {filteredMovements.length === 0 ? (
            <EmptyState icon={ArrowDownCircle} title="אין תנועות מלאי" description={movementDateRange ? 'אין תנועות בטווח זה.' : 'תנועות מלאי יופיעו כאן לאחר הזמנות.'} />
          ) : (
            <div className="space-y-2">{filteredMovements.map(mov => {
              const itemName = items.find(i => i.id === mov.inventory_item_id)?.name ?? 'מוצר';
              const itemUnit = items.find(i => i.id === mov.inventory_item_id)?.unit ?? '';
              return (
                <div key={mov.id} className="bg-card rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0"><ArrowDownCircle className="w-4 h-4 text-orange-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{itemName}</p>
                      <span className="text-xs text-orange-600 font-medium">−{Number(mov.quantity_used).toFixed(1)} {itemUnit}</span>
                      {mov.menu_item_name && <span className="text-xs text-muted-foreground">← {mov.menu_item_name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(mov.created_at)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{mov.movement_type === 'order' ? 'הזמנה' : mov.movement_type}</Badge>
                </div>
              );
            })}</div>
          )}
        </div>
      )}

      {/* ─── Suppliers tab ─── */}
      {tab === 'suppliers' && (
        <div className="space-y-2">
          {suppliers.length === 0 ? <div className="bg-card rounded-2xl p-8 shadow-sm text-center"><Truck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground">אין ספקים.</p></div>
          : suppliers.map(supplier => {
            const supplierItems = items.filter(i => i.supplier_id === supplier.id);
            const supplierHistory = priceHistory.filter(p => p.supplier_id === supplier.id);
            const isExpanded = expandedSupplier === supplier.id;
            const totalIncrease = supplierHistory.reduce((sum, p) => sum + (p.new_price - p.old_price), 0);
            return (
              <div key={supplier.id} className="bg-card rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{supplier.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {supplier.contact_name && <span className="text-xs text-muted-foreground">איש קשר: {supplier.contact_name}</span>}
                      {supplier.phone && <a href={`tel:${supplier.phone}`} className="text-xs text-primary">{supplier.phone}</a>}
                      <span className="text-xs text-muted-foreground">{supplierItems.length} מוצרים</span>
                      {supplierHistory.length > 0 && <span className={`text-xs font-medium flex items-center gap-0.5 ${totalIncrease > 0 ? 'text-red-600' : 'text-green-600'}`}>{totalIncrease > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{supplierHistory.length} שינויי מחיר</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditSupplier(supplier)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>למחוק את {supplier.name}?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteSupplier(supplier.id)}>מחק</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                  <Button variant="ghost" size="icon" onClick={() => setExpandedSupplier(isExpanded ? null : supplier.id)}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {supplierItems.length > 0 && <div><p className="text-xs font-medium text-muted-foreground mb-1.5">מוצרים:</p><div className="flex flex-wrap gap-1.5">{supplierItems.map(item => <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">{item.name} — ₪{item.cost_price}</span>)}</div></div>}
                    {supplierHistory.length > 0 && (
                      <div><p className="text-xs font-medium text-muted-foreground mb-1.5">שינויי מחיר:</p>
                        <div className="space-y-1.5">{supplierHistory.slice(0, 5).map(h => {
                          const itemName = items.find(i => i.id === h.inventory_item_id)?.name ?? 'מוצר';
                          const diff = h.new_price - h.old_price; const pct = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '0';
                          return (<div key={h.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5"><div className="flex items-center gap-2"><span className="text-xs font-medium text-foreground">{itemName}</span><span className="text-xs text-muted-foreground">₪{h.old_price} → ₪{h.new_price}</span></div><div className="flex items-center gap-2"><span className={`text-xs font-bold flex items-center gap-0.5 ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>{diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{diff > 0 ? '+' : ''}{pct}%</span><span className="text-xs text-muted-foreground">{fmtDate(h.changed_at)}</span></div></div>);
                        })}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Price History tab ─── */}
      {tab === 'prices' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <DateRangePicker value={priceDateRange} onChange={setPriceDateRange} />
            <Select value={priceFilterSupplier} onValueChange={setPriceFilterSupplier}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="כל הספקים" /></SelectTrigger>
              <SelectContent><SelectItem value="all">כל הספקים</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {priceDateRange && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
              {new Date(priceDateRange.from).toLocaleDateString('he-IL')} — {new Date(priceDateRange.to).toLocaleDateString('he-IL')} · {filteredPriceHistory.length} שינויים
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-foreground">{filteredPriceHistory.length}</p><p className="text-xs text-muted-foreground">שינויים</p></div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-red-600">{filteredPriceHistory.filter(p => p.new_price > p.old_price).length}</p><p className="text-xs text-muted-foreground">העלאות</p></div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center"><p className="text-2xl font-bold text-green-600">{filteredPriceHistory.filter(p => p.new_price < p.old_price).length}</p><p className="text-xs text-muted-foreground">הורדות</p></div>
          </div>

          {filteredPriceHistory.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-sm text-center"><History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground">אין שינויי מחיר בטווח זה.</p></div>
          ) : (
            <div className="space-y-2">{filteredPriceHistory.map(h => {
              const itemName = items.find(i => i.id === h.inventory_item_id)?.name ?? 'מוצר';
              const supplierName = suppliers.find(s => s.id === h.supplier_id)?.name ?? '—';
              const diff = h.new_price - h.old_price; const pct = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '0'; const isUp = diff > 0;
              return (
                <div key={h.id} className={`bg-card rounded-xl p-4 shadow-sm border ${isUp ? 'border-red-100' : 'border-green-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-foreground text-sm">{itemName}</p><span className="text-xs text-muted-foreground">· {supplierName}</span></div>
                      <div className="flex items-center gap-3 mt-1"><span className="text-xs text-muted-foreground line-through">₪{h.old_price}</span><span className="text-xs">→</span><span className="text-sm font-bold text-foreground">₪{h.new_price}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{isUp ? '+' : ''}{pct}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{fmtDate(h.changed_at)}</p>
                  </div>
                </div>
              );
            })}</div>
          )}
        </div>
      )}

      {/* Item Sheet */}
      <Sheet open={itemSheet} onOpenChange={setItemSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingItem ? 'עריכת מוצר' : 'הוספת מוצר'}</SheetTitle></SheetHeader>
          {editingItem && itemForm.cost_price !== editingItem.cost_price && editingItem.cost_price > 0 && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${itemForm.cost_price > editingItem.cost_price ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {itemForm.cost_price > editingItem.cost_price ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              שינוי מחיר: ₪{editingItem.cost_price} → ₪{itemForm.cost_price} — יישמר בהיסטוריה
            </div>
          )}
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>שם המוצר *</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="שמן זית, קמח..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>יחידת מידה</Label><Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>עלות ליחידה (₪)</Label><Input type="number" min={0} value={itemForm.cost_price} onChange={e => setItemForm(f => ({ ...f, cost_price: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>כמות במלאי</Label><Input type="number" min={0} value={itemForm.current_stock} onChange={e => setItemForm(f => ({ ...f, current_stock: +e.target.value }))} /></div>
              <div className="space-y-1"><Label>מינימום להתראה</Label><Input type="number" min={0} value={itemForm.min_stock} onChange={e => setItemForm(f => ({ ...f, min_stock: +e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>ספק</Label>
              <Select value={itemForm.supplier_id || 'none'} onValueChange={v => setItemForm(f => ({ ...f, supplier_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="בחר ספק..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">ללא ספק</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}<SelectItem value="new">➕ ספק חדש...</SelectItem></SelectContent>
              </Select>
              {itemForm.supplier_id === 'new' && (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Input autoFocus placeholder="הקלד שם ספק חדש..." className="mt-2" onChange={e => setItemForm(f => ({ ...f, newSupplierName: e.target.value } as any))} />
              )}
            </div>
          </div>
          <SheetFooter className="mt-6"><Button variant="outline" onClick={() => setItemSheet(false)}>ביטול</Button><Button onClick={saveItem} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingItem ? 'עדכן' : 'הוסף'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Supplier Sheet */}
      <Sheet open={supplierSheet} onOpenChange={setSupplierSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingSupplier ? 'עריכת ספק' : 'הוספת ספק'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>שם הספק *</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder="שם החברה / הספק" /></div>
            <div className="space-y-1"><Label>טלפון</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" /></div>
            <div className="space-y-1"><Label>איש קשר</Label><Input value={supplierForm.contact_name} onChange={e => setSupplierForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="שם איש הקשר" /></div>
            <div className="space-y-1"><Label>הערות</Label><Textarea value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <SheetFooter className="mt-6"><Button variant="outline" onClick={() => setSupplierSheet(false)}>ביטול</Button><Button onClick={saveSupplier} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingSupplier ? 'עדכן' : 'הוסף'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

function GatedAdminInventory() {
  return <FeatureGate feature="inventory"><AdminInventory /></FeatureGate>;
}
export default GatedAdminInventory;