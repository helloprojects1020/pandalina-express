// ── Dev override ─────────────────────────────────────────────────────────────
// Set to `true` to bypass ALL feature restrictions during development / QA.
// Set to `false` (or remove) to re-enable plan-based access control.
export const DEV_UNLOCK_ALL_FEATURES = true;

// ── Feature key union — mirrors the `key` column in the features table ──────

export type FeatureKey =
  | 'orders'
  | 'menu'
  | 'customers'
  | 'delivery_zones'
  | 'analytics'
  | 'inventory'
  | 'reports'
  | 'daily'
  | 'staff'
  | 'menu_performance'
  | 'export'
  | 'costing'
  | 'whatsapp_automation'
  | 'advanced_analytics';

export type PlanSlug = 'free' | 'pro' | 'enterprise';

// ── Plan hierarchy ────────────────────────────────────────────────────────────

export const PLAN_RANK: Record<PlanSlug, number> = {
  free:       0,
  pro:        1,
  enterprise: 2,
};

export const PLAN_LABEL: Record<PlanSlug, string> = {
  free:       'Free',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

/** The minimum plan required to access each feature */
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanSlug> = {
  orders:              'free',
  menu:                'free',
  customers:           'pro',
  delivery_zones:      'pro',
  analytics:           'pro',
  inventory:           'pro',
  reports:             'pro',
  daily:               'pro',
  staff:               'pro',
  menu_performance:    'pro',
  export:              'pro',
  costing:             'enterprise',
  whatsapp_automation: 'enterprise',
  advanced_analytics:  'enterprise',
};

// ── Context value ─────────────────────────────────────────────────────────────

export interface FeatureFlagsContextValue {
  /** Returns true if the restaurant currently has access to this feature */
  hasFeature: (key: FeatureKey) => boolean;
  /** Current plan slug — defaults to 'free' when no subscription exists */
  plan: PlanSlug;
  /** True while the initial data fetch is in-flight */
  loading: boolean;
  /** Force a re-fetch (used by AdminPlatformControl after plan changes) */
  refresh: () => void;
}

// ── Raw DB row shapes (internal to the hook) ─────────────────────────────────

export interface PlanFeatureRow {
  enabled: boolean;
  features: { key: string } | null;
}

export interface SubscriptionRow {
  plan_id: string;
  status: string;
  plans: {
    slug: string;
    plan_features: PlanFeatureRow[];
  } | null;
}

export interface OverrideRow {
  feature_key: string;
  enabled: boolean;
}

// ── AdminPlatformControl ──────────────────────────────────────────────────────

export interface RestaurantPlanRow {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  plan_slug: PlanSlug;
  plan_name: string;
  status: string;
  expires_at: string | null;
}

export interface FeatureOverrideMap {
  [featureKey: string]: boolean | undefined;
}
