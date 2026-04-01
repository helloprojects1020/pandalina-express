import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Shield, Building2, Crown, Zap, Lock, Users,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle,
} from 'lucide-react';
import {
  PageHeader, KpiCard, SectionCard, EmptyState, LoadingState,
} from '@/components/admin/AdminUI';
import type { RestaurantPlanRow, PlanSlug, FeatureKey, FeatureOverrideMap } from '@/types/featureFlags';
import { FEATURE_MIN_PLAN } from '@/types/featureFlags';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Super-admin gate ──────────────────────────────────────────────────────────

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_FEATURE_KEYS = Object.keys(FEATURE_MIN_PLAN) as FeatureKey[];

const PLAN_SLUGS: PlanSlug[] = ['free', 'pro', 'enterprise'];

const PLAN_BADGE: Record<PlanSlug, string> = {
  free:       'bg-slate-100 text-slate-600 border-slate-200',
  pro:        'bg-blue-100 text-blue-700 border-blue-300',
  enterprise: 'bg-purple-100 text-purple-700 border-purple-300',
};

const PLAN_LABEL: Record<PlanSlug, string> = {
  free:       'Free',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminPlatformControl = () => {
  const { user } = useAuth();

  const isSuperAdmin = user?.email
    ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) || true // TODO: remove || true before prod
    : false;

  const [rows, setRows]           = useState<RestaurantPlanRow[]>([]);
  const [plans, setPlans]         = useState<{ id: string; slug: PlanSlug; name: string }[]>([]);
  const [overrides, setOverrides] = useState<Record<string, FeatureOverrideMap>>({}); // restaurantId → overrideMap
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null); // restaurantId

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rpcResult, plansResult, overridesResult] = await Promise.all([
        db.rpc('admin_get_all_restaurant_plans') as Promise<{ data: RestaurantPlanRow[] | null }>,
        db.from('plans').select('id, slug, name').order('sort_order'),
        db.from('restaurant_feature_overrides').select('restaurant_id, feature_key, enabled'),
      ]);

      setRows(rpcResult.data ?? []);
      setPlans(plansResult.data ?? []);

      // Build override map: { [restaurantId]: { [featureKey]: boolean } }
      const ovMap: Record<string, FeatureOverrideMap> = {};
      for (const ov of overridesResult.data ?? []) {
        if (!ovMap[ov.restaurant_id]) ovMap[ov.restaurant_id] = {};
        ovMap[ov.restaurant_id][ov.feature_key] = ov.enabled;
      }
      setOverrides(ovMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Plan change ────────────────────────────────────────────────────────────

  const changePlan = async (restaurantId: string, planSlug: PlanSlug) => {
    const plan = plans.find(p => p.slug === planSlug);
    if (!plan) return;
    setSaving(restaurantId);
    try {
      await db.from('restaurant_subscriptions').upsert(
        { restaurant_id: restaurantId, plan_id: plan.id, status: 'active', started_at: new Date().toISOString() },
        { onConflict: 'restaurant_id' }
      );
      setRows(prev => prev.map(r =>
        r.restaurant_id === restaurantId
          ? { ...r, plan_slug: planSlug, plan_name: PLAN_LABEL[planSlug], status: 'active' }
          : r
      ));
      toast({ title: 'תוכנית עודכנה', description: `${planSlug} activated` });
    } catch (err) {
      toast({ title: 'שגיאה', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  // ── Feature override toggle ────────────────────────────────────────────────

  const toggleOverride = async (restaurantId: string, featureKey: string, enabled: boolean) => {
    try {
      await db.from('restaurant_feature_overrides').upsert(
        { restaurant_id: restaurantId, feature_key: featureKey, enabled },
        { onConflict: 'restaurant_id,feature_key' }
      );
      setOverrides(prev => ({
        ...prev,
        [restaurantId]: { ...(prev[restaurantId] ?? {}), [featureKey]: enabled },
      }));
    } catch (err) {
      toast({ title: 'שגיאה', variant: 'destructive', description: String(err) });
    }
  };

  const clearOverride = async (restaurantId: string, featureKey: string) => {
    try {
      await db.from('restaurant_feature_overrides')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('feature_key', featureKey);
      setOverrides(prev => {
        const next = { ...prev, [restaurantId]: { ...(prev[restaurantId] ?? {}) } };
        delete next[restaurantId][featureKey];
        return next;
      });
    } catch (err) {
      toast({ title: 'שגיאה', variant: 'destructive', description: String(err) });
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!isSuperAdmin) {
    return (
      <div className="space-y-5" dir="rtl">
        <PageHeader title="ניהול פלטפורמה" description="גישת סופר-אדמין בלבד" />
        <EmptyState
          icon={Lock}
          title="גישה נדחתה"
          description="עמוד זה מוגבל לסופר-אדמין של Bitelyx בלבד."
        />
      </div>
    );
  }

  if (loading) return <LoadingState />;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const byPlan = (slug: string) => rows.filter(r => r.plan_slug === slug).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="ניהול פלטפורמה"
        description="שליטה מלאה על תוכניות ותכונות לכל עסק"
        actions={
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            רענן
          </button>
        }
      >
        {/* Super-admin badge in title area */}
      </PageHeader>

      {/* Super-admin indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-300/40 rounded-xl">
        <Shield className="w-4 h-4 text-purple-600 shrink-0" />
        <p className="text-xs font-semibold text-purple-700">Bitelyx Super Admin — {user?.email}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="עסקים פעילים" value={rows.length}       icon={Building2} accent="#3b82f6" />
        <KpiCard label="תוכנית Free"   value={byPlan('free')}   icon={Users}     accent="#64748b" />
        <KpiCard label="תוכנית Pro"    value={byPlan('pro')}    icon={Zap}       accent="#3b82f6" />
        <KpiCard label="Enterprise"   value={byPlan('enterprise')} icon={Crown} accent="#8b5cf6" />
      </div>

      {/* Restaurant list */}
      <SectionCard title="עסקים ותוכניות" icon={Building2} noPadding>
        {rows.length === 0 ? (
          <EmptyState icon={Building2} title="אין עסקים" description="לא נמצאו עסקים פעילים במערכת." />
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map(row => {
              const isExpanded = expanded === row.restaurant_id;
              const rowOverrides = overrides[row.restaurant_id] ?? {};

              return (
                <div key={row.restaurant_id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    {/* Restaurant info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{row.restaurant_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{row.restaurant_slug}</p>
                    </div>

                    {/* Plan selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${PLAN_BADGE[row.plan_slug]}`}>
                        {PLAN_LABEL[row.plan_slug]}
                      </span>
                      <select
                        value={row.plan_slug}
                        disabled={saving === row.restaurant_id}
                        onChange={e => changePlan(row.restaurant_id, e.target.value as PlanSlug)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        {PLAN_SLUGS.map(slug => (
                          <option key={slug} value={slug}>{PLAN_LABEL[slug]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      row.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                    }`}>
                      {row.status}
                    </span>

                    {/* Override toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : row.restaurant_id)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Override panel */}
                  {isExpanded && (
                    <div className="bg-muted/30 border-t border-border/40 px-5 py-4">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        עקיפות ידניות — {row.restaurant_name}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {ALL_FEATURE_KEYS.map(featureKey => {
                          const overrideValue = rowOverrides[featureKey];
                          const hasOverride   = overrideValue !== undefined;
                          const minPlan       = FEATURE_MIN_PLAN[featureKey];

                          return (
                            <div
                              key={featureKey}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                                hasOverride
                                  ? overrideValue
                                    ? 'border-emerald-300 bg-emerald-500/8'
                                    : 'border-red-300 bg-red-500/8'
                                  : 'border-border/50 bg-card'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{featureKey}</p>
                                <p className="text-[10px] text-muted-foreground">{minPlan}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {hasOverride && (
                                  <button
                                    onClick={() => clearOverride(row.restaurant_id, featureKey)}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                    title="הסר עקיפה"
                                  >
                                    ×
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleOverride(row.restaurant_id, featureKey, true)}
                                  className={`p-1 rounded-lg transition-colors ${overrideValue === true ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-700'}`}
                                  title="הפעל"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleOverride(row.restaurant_id, featureKey, false)}
                                  className={`p-1 rounded-lg transition-colors ${overrideValue === false ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-red-500/20 hover:text-red-700'}`}
                                  title="בטל"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Plan definitions */}
      <SectionCard title="הגדרות תוכניות" icon={Crown}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => {
            const features = ALL_FEATURE_KEYS.filter(k => {
              const minPlan = FEATURE_MIN_PLAN[k];
              const rank: Record<PlanSlug, number> = { free: 0, pro: 1, enterprise: 2 };
              return rank[minPlan] <= rank[plan.slug as PlanSlug];
            });
            return (
              <div key={plan.id} className={`rounded-2xl border p-4 ${PLAN_BADGE[plan.slug as PlanSlug]}`}>
                <p className="font-black text-sm mb-3">{plan.name}</p>
                <div className="space-y-1">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle className="w-3 h-3 shrink-0 opacity-70" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

export default AdminPlatformControl;
