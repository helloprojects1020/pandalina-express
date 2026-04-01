import {
  createContext, useContext, useEffect, useState,
  useMemo, useCallback, useRef, type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  FeatureFlagsContextValue, FeatureKey, PlanSlug,
  SubscriptionRow, OverrideRow,
} from '@/types/featureFlags';
import { DEV_UNLOCK_ALL_FEATURES } from '@/types/featureFlags';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Features always available regardless of plan */
const FREE_FEATURES = new Set<string>(['orders', 'menu']);

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const { restaurantId, loading: authLoading } = useAuth();

  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(FREE_FEATURES);
  const [plan, setPlan]                       = useState<PlanSlug>('free');
  const [loading, setLoading]                 = useState(true);
  const fetchCountRef                         = useRef(0);

  const fetchFlags = useCallback(async () => {
    if (authLoading) return;
    if (!restaurantId) {
      setEnabledFeatures(FREE_FEATURES);
      setPlan('free');
      setLoading(false);
      return;
    }

    setLoading(true);
    const thisCount = ++fetchCountRef.current;

    try {
      const [subResult, overridesResult] = await Promise.all([
        db
          .from('restaurant_subscriptions')
          .select(`
            plan_id,
            status,
            plans (
              slug,
              plan_features (
                enabled,
                features ( key )
              )
            )
          `)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'active')
          .maybeSingle() as Promise<{ data: SubscriptionRow | null }>,

        db
          .from('restaurant_feature_overrides')
          .select('feature_key, enabled')
          .eq('restaurant_id', restaurantId) as Promise<{ data: OverrideRow[] | null }>,
      ]);

      // Stale check — a newer fetch may have already completed
      if (thisCount !== fetchCountRef.current) return;

      const sub       = subResult.data;
      const overrides = overridesResult.data ?? [];

      const baseFeatures = new Set<string>(FREE_FEATURES);
      let resolvedPlan: PlanSlug = 'free';

      if (sub?.plans) {
        resolvedPlan = (sub.plans.slug as PlanSlug) ?? 'free';
        for (const pf of sub.plans.plan_features ?? []) {
          if (pf.enabled && pf.features?.key) {
            baseFeatures.add(pf.features.key);
          }
        }
      }

      // Manual per-restaurant overrides take priority over plan
      for (const ov of overrides) {
        if (ov.enabled) {
          baseFeatures.add(ov.feature_key);
        } else {
          baseFeatures.delete(ov.feature_key);
        }
      }

      setEnabledFeatures(baseFeatures);
      setPlan(resolvedPlan);
    } catch {
      // Network failure: fall back gracefully
      if (thisCount === fetchCountRef.current) {
        setEnabledFeatures(FREE_FEATURES);
        setPlan('free');
      }
    } finally {
      if (thisCount === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, [restaurantId, authLoading]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const hasFeature = useCallback(
    (key: FeatureKey): boolean => DEV_UNLOCK_ALL_FEATURES || enabledFeatures.has(key),
    [enabledFeatures],
  );

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({ hasFeature, plan, loading, refresh: fetchFlags }),
    [hasFeature, plan, loading, fetchFlags],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useFeatureFlags = (): FeatureFlagsContextValue => {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used inside FeatureFlagsProvider');
  return ctx;
};
