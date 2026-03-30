import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarRange, X } from 'lucide-react';

export type DateRange = {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
} | null;

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value?.from ?? '');
  const [to, setTo] = useState(value?.to ?? '');

  const apply = () => {
    if (from && to) {
      onChange({ from, to });
      setOpen(false);
    }
  };

  const clear = () => {
    setFrom('');
    setTo('');
    onChange(null);
    setOpen(false);
  };

  const fmtDisplay = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="relative">
      <Button
        variant={value ? 'default' : 'outline'}
        size="sm"
        onClick={() => setOpen(v => !v)}
        className="h-9 gap-1.5"
      >
        <CalendarRange className="w-4 h-4" />
        {value ? `${fmtDisplay(value.from)} — ${fmtDisplay(value.to)}` : 'בחר תאריכים'}
        {value && (
          <span
            onClick={e => { e.stopPropagation(); clear(); }}
            className="mr-1 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 top-10 z-50 bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 min-w-64" dir="rtl">
            <p className="text-sm font-semibold text-foreground">בחר טווח תאריכים</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">מתאריך</Label>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">עד תאריך</Label>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            {/* קיצורים מהירים */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'היום', days: 0 },
                { label: 'שבוע', days: 7 },
                { label: 'חודש', days: 30 },
                { label: '3 חודשים', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => {
                    const t = new Date();
                    const f = new Date();
                    f.setDate(f.getDate() - days);
                    setFrom(f.toISOString().split('T')[0]);
                    setTo(t.toISOString().split('T')[0]);
                  }}
                  className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-lg"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={apply} disabled={!from || !to} className="flex-1">החל</Button>
              <Button size="sm" variant="outline" onClick={clear}>נקה</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}