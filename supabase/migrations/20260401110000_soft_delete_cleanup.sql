-- ============================================================
-- Soft-delete column standardization
-- ============================================================
-- Current schema state (verified in Supabase):
--   categories:              has deleted (bool) + deleted_at (timestamptz)
--   menu_items:              has deleted (bool) + deleted_at (timestamptz)
--   menu_item_options:       has deleted (bool) only
--   menu_item_option_values: has deleted (bool) only
--
-- Code audit: zero references to `deleted` or `deleted_at` columns
-- in src/ or supabase/migrations/. All filtering uses is_active.
--
-- Action:
--   1. Drop `deleted` bool from all four tables (redundant, unused)
--   2. Add `deleted_at` to the two tables that lack it (future-proof,
--      consistent pattern — still nullable, still unused by code)
-- ============================================================

-- categories: drop `deleted`, keep `deleted_at`
ALTER TABLE public.categories
  DROP COLUMN IF EXISTS deleted;

-- menu_items: drop `deleted`, keep `deleted_at`
ALTER TABLE public.menu_items
  DROP COLUMN IF EXISTS deleted;

-- menu_item_options: drop `deleted`, add `deleted_at`
ALTER TABLE public.menu_item_options
  DROP COLUMN IF EXISTS deleted;

ALTER TABLE public.menu_item_options
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- menu_item_option_values: drop `deleted`, add `deleted_at`
ALTER TABLE public.menu_item_option_values
  DROP COLUMN IF EXISTS deleted;

ALTER TABLE public.menu_item_option_values
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;