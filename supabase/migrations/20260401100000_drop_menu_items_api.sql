-- ============================================================
-- Drop menu_items_api view/table
-- ============================================================
-- Verified safe: grep of entire codebase (src/, supabase/) finds
-- zero references to 'menu_items_api'. No code change needed.
-- ============================================================

DROP VIEW  IF EXISTS public.menu_items_api;
DROP TABLE IF EXISTS public.menu_items_api;