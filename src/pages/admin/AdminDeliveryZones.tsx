import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Truck, MapPin, Search } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// רשימת ערים וישובים
const ALL_CITIES = [
  // צפון
  'עכו', 'נהריה', 'חיפה', 'קריית אתא', 'קריית ביאליק', 'קריית מוצקין', 'קריית ים',
  'טבריה', 'צפת', 'כרמיאל', 'מעלות-תרשיחא', 'שלומי', 'נצרת עילית', 'נצרת',
  'עפולה', 'בית שאן', 'חדרה', 'זכרון יעקב', 'פרדס חנה',
  // ישובים ערביים בצפון
  'כפר יאסיף', 'ג\'סר א-זרקא', 'כפר כנא', 'ערערה', 'אום אל-פחם',
  'שפרעם', 'ירכא', 'דיר חנא', 'עילבון', 'סח\'נין', 'ערב אל-עראמשה',
  'כפר מנדא', 'טמרה', 'ג\'ולס', 'בקה אל-גרביה', 'כפר קרע',
  'אבו סנאן', 'יסיף', 'מג\'ד אל-כרום', 'ריינה', 'כאבול',
  'עוספיא', 'דלית אל-כרמל', 'פוריידיס', 'ג\'ת', 'ערערה-בנגב',
  // מרכז
  'תל אביב', 'ירושלים', 'באר שבע', 'אשדוד', 'אשקלון', 'נתניה',
  'פתח תקווה', 'ראשון לציון', 'רחובות', 'הרצליה', 'רמת גן',
  'בני ברק', 'חולון', 'בת ים', 'רמלה', 'לוד', 'מודיעין',
  'כפר סבא', 'רעננה', 'הוד השרון', 'קלנסווה', 'טייבה', 'טירה',
].sort((a, b) => a.localeCompare(b, 'he'));

type DeliveryZone = {
  id: string;
  restaurant_id: string;
  zone_name: string;
  description: string | null;
  delivery_fee: number;
  min_order: number;
  active: boolean;
  match_keywords: string | null;
  cities: string[];
};

const emptyForm = {
  zone_name: '',
  description: '',
  delivery_fee: 0,
  min_order: 0,
  active: true,
  cities: [] as string[],
};

const AdminDeliveryZones = () => {
  const { restaurantId } = useAuth();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = citySearch.trim()
    ? ALL_CITIES.filter(c => c.includes(citySearch.trim()))
    : ALL_CITIES;

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    db.from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('delivery_fee')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] }) => {
        setZones((data ?? []).map(z => ({
          ...z,
          active: z.active === true,
          cities: Array.isArray(z.cities) ? z.cities : [],
        })));
        setLoading(false);
      });
  }, [restaurantId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setCitySearch('');
    setSheetOpen(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditing(zone);
    setForm({
      zone_name: zone.zone_name,
      description: zone.description ?? '',
      delivery_fee: zone.delivery_fee,
      min_order: zone.min_order,
      active: zone.active,
      cities: Array.isArray(zone.cities) ? zone.cities : [],
    });
    setCitySearch('');
    setSheetOpen(true);
  };

  const toggleCity = (city: string) => {
    setForm(f => ({
      ...f,
      cities: f.cities.includes(city)
        ? f.cities.filter(c => c !== city)
        : [...f.cities, city],
    }));
  };

  const handleSave = async () => {
    if (!restaurantId || !form.zone_name) {
      toast({ title: 'שם האזור הוא שדה חובה', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      restaurant_id: restaurantId,
      zone_name: form.zone_name,
      description: form.description || null,
      delivery_fee: form.delivery_fee,
      min_order: form.min_order,
      active: form.active,
      cities: form.cities,
      // שמור גם כ-keywords לתאימות אחורה
      match_keywords: form.cities.join(', '),
    };

    if (editing) {
      const { data, error } = await db
        .from('delivery_zones')
        .update(payload)
        .eq('id', editing.id)
        .select('*')
        .single();

      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setZones(prev => prev.map(z => z.id === editing.id ? { ...data, active: data.active === true, cities: Array.isArray(data.cities) ? data.cities : [] } : z));
      toast({ title: 'האזור עודכן ✅' });
    } else {
      const { data, error } = await db
        .from('delivery_zones')
        .insert(payload)
        .select('*')
        .single();

      setSaving(false);
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); return; }
      setZones(prev => [...prev, { ...data, active: data.active === true, cities: Array.isArray(data.cities) ? data.cities : [] }]);
      toast({ title: 'האזור נוצר ✅' });
    }

    setSheetOpen(false);
  };

  const handleDelete = async (id: string) => {
    await db.from('delivery_zones').delete().eq('id', id);
    setZones(prev => prev.filter(z => z.id !== id));
    toast({ title: 'האזור נמחק' });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await db.from('delivery_zones').update({ active }).eq('id', id);
    setZones(prev => prev.map(z => z.id === id ? { ...z, active } : z));
  };

  if (!restaurantId || loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">אזורי משלוח</h1>
          <p className="text-sm text-muted-foreground mt-0.5">הגדר לאן המסעדה מספקת משלוחים ובאיזה מחיר</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 ml-1" /> הוסף אזור
        </Button>
      </div>

      {zones.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
          <Truck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">אין אזורי משלוח. הוסף אזור ראשון.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {zones.map(zone => (
            <div key={zone.id} className={`bg-card rounded-xl p-4 shadow-sm flex items-center gap-4 ${!zone.active ? 'opacity-60' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{zone.zone_name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    משלוח: {zone.delivery_fee === 0 ? 'חינם' : `₪${zone.delivery_fee}`}
                  </span>
                  {zone.min_order > 0 && (
                    <span className="text-xs text-muted-foreground">מינימום: ₪{zone.min_order}</span>
                  )}
                  {zone.cities.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      🏘️ {zone.cities.length} ישובים
                    </span>
                  )}
                </div>
                {zone.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {zone.cities.slice(0, 5).map(city => (
                      <span key={city} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{city}</span>
                    ))}
                    {zone.cities.length > 5 && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">+{zone.cities.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
              <Switch checked={zone.active === true} onCheckedChange={v => handleToggle(zone.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
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
                    <AlertDialogTitle>למחוק אזור?</AlertDialogTitle>
                    <AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete(zone.id)}
                    >מחק</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editing ? 'עריכת אזור משלוח' : 'אזור משלוח חדש'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>שם האזור *</Label>
              <Input
                value={form.zone_name}
                onChange={e => setForm(f => ({ ...f, zone_name: e.target.value }))}
                placeholder="צפון, נהריה, כפר יאסיף..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>מחיר משלוח (₪)</Label>
                <Input
                  type="number" min={0}
                  value={form.delivery_fee}
                  onChange={e => setForm(f => ({ ...f, delivery_fee: +e.target.value }))}
                />
                {form.delivery_fee === 0 && <p className="text-xs text-green-600">✓ משלוח חינם</p>}
              </div>
              <div className="space-y-1">
                <Label>מינימום הזמנה (₪)</Label>
                <Input
                  type="number" min={0}
                  value={form.min_order}
                  onChange={e => setForm(f => ({ ...f, min_order: +e.target.value }))}
                />
              </div>
            </div>

            {/* בחירת ישובים */}
            <div className="space-y-2">
              <Label>ישובים באזור זה ({form.cities.length} נבחרו)</Label>

              {/* חיפוש */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="חפש ישוב..."
                  className="pr-8 h-8 text-sm"
                />
              </div>

              {/* ישובים נבחרים */}
              {form.cities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-primary/5 rounded-lg border border-primary/20">
                  {form.cities.map(city => (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-primary/80"
                    >
                      {city} ×
                    </button>
                  ))}
                </div>
              )}

              {/* רשימת ישובים */}
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredCities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">לא נמצאו ישובים</p>
                ) : (
                  <div className="grid grid-cols-2 gap-0">
                    {filteredCities.map(city => (
                      <button
                        key={city}
                        onClick={() => toggleCity(city)}
                        className={`text-right text-xs px-3 py-2 hover:bg-muted transition-colors border-b border-border/50 ${
                          form.cities.includes(city) ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                        }`}
                      >
                        {form.cities.includes(city) && '✓ '}{city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>אזור פעיל</Label>
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

export default AdminDeliveryZones;