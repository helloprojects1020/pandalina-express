import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey, type PlanSlug } from '@/types/featureFlags';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeatureGateProps {
  /** The feature key to check */
  feature: FeatureKey;
  /** Content to show when the feature is enabled */
  children: ReactNode;
  /** Custom fallback — if omitted the default locked UI renders */
  fallback?: ReactNode;
  /** Override which plan unlocks this. Defaults to FEATURE_MIN_PLAN[feature] */
  planRequired?: PlanSlug;
}

// ─── Plan badge colours ───────────────────────────────────────────────────────

const PLAN_STYLE: Record<PlanSlug, { badge: string; glow: string; button: string }> = {
  free: {
    badge:  'bg-slate-100 text-slate-700 border-slate-200',
    glow:   'rgba(100,116,139,0.1)',
    button: 'bg-slate-900 hover:bg-slate-700',
  },
  pro: {
    badge:  'bg-blue-100 text-blue-700 border-blue-300',
    glow:   'rgba(59,130,246,0.12)',
    button: 'bg-blue-600 hover:bg-blue-500',
  },
  enterprise: {
    badge:  'bg-purple-100 text-purple-700 border-purple-300',
    glow:   'rgba(139,92,246,0.12)',
    button: 'bg-purple-600 hover:bg-purple-500',
  },
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function FeatureSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-muted/50 rounded-xl w-1/3" />
      <div className="h-32 bg-muted/40 rounded-2xl" />
    </div>
  );
}

// ─── Locked UI ────────────────────────────────────────────────────────────────

function LockedOverlay({ plan, feature }: { plan: PlanSlug; feature: FeatureKey }) {
  const style   = PLAN_STYLE[plan];
  const label   = PLAN_LABEL[plan];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
      style={{ background: `radial-gradient(ellipse at center, ${style.glow} 0%, rgba(255,255,255,0.85) 70%)` }}>
      <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-7 max-w-[300px] text-center space-y-4">
        {/* Lock icon */}
        <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Text */}
        <div>
          <p className="font-black text-foreground text-sm tracking-tight">
            תכונה נעולה
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {`תכונה זו זמינה בתוכנית ${label} ומעלה.`}
          </p>
        </div>

        {/* Plan badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.badge}`}>
          <Sparkles className="w-3 h-3" />
          {label} Plan
        </span>

        {/* CTA */}
        <Link
          to="/admin/settings"
          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-white text-xs font-semibold transition-colors ${style.button}`}
        >
          שדרג תוכנית
        </Link>
      </div>
    </div>
  );
}

// ─── FeatureGate ─────────────────────────────────────────────────────────────

export function FeatureGate({ feature, children, fallback, planRequired }: FeatureGateProps) {
  const { hasFeature, loading } = useFeatureFlags();

  if (loading) return <FeatureSkeleton />;

  if (hasFeature(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const requiredPlan = planRequired ?? FEATURE_MIN_PLAN[feature];

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[300px]">
      {/* Blurred preview of actual content */}
      <div
        aria-hidden="true"
        style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6 }}
      >
        {children}
      </div>
      {/* Lock overlay */}
      <LockedOverlay plan={requiredPlan} feature={feature} />
    </div>
  );
}
