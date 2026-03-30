import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  restaurantId: string | null;
  restaurantSlug: string | null;
  loading: boolean;
  setRestaurantId: (id: string) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]                      = useState<User | null>(null);
  const [session, setSession]                = useState<Session | null>(null);
  const [isAdmin, setIsAdmin]                = useState(false);
  const [restaurantId, setRestaurantIdState] = useState<string | null>(
    () => localStorage.getItem('adminRestaurantId')
  );
  const [restaurantSlug, setRestaurantSlug]  = useState<string | null>(null);
  const [loading, setLoading]                = useState(true);

  // load slug whenever restaurantId changes
  useEffect(() => {
    if (!restaurantId) { setRestaurantSlug(null); return; }
    db.from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .maybeSingle()
      .then(({ data }: { data: { slug: string } | null }) =>
        setRestaurantSlug(data?.slug ?? null)
      );
  }, [restaurantId]);

  // ── Single source of truth: restaurant_users only ─────────────────────────
  const loadRestaurantForUser = useCallback(async (userId: string) => {
    const { data: ruData } = await db
      .from('restaurant_users')
      .select('restaurant_id')
      .eq('user_id', userId)
      .eq('is_active', true) as { data: { restaurant_id: string }[] | null };

    const rows = ruData ?? [];
    if (rows.length > 0) {
      setIsAdmin(true);
      const saved    = localStorage.getItem('adminRestaurantId');
      const validIds = rows.map((r: { restaurant_id: string }) => r.restaurant_id);
      const activeId = saved && validIds.includes(saved) ? saved : validIds[0];
      setRestaurantIdState(activeId);
      localStorage.setItem('adminRestaurantId', activeId);
    } else {
      setIsAdmin(false);
      setRestaurantIdState(null);
      setRestaurantSlug(null);
      localStorage.removeItem('adminRestaurantId');
    }
  }, []);

  const setRestaurantId = useCallback((id: string) => {
    setRestaurantIdState(id);
    localStorage.setItem('adminRestaurantId', id);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          setTimeout(() => loadRestaurantForUser(sess.user.id), 0);
        } else {
          setIsAdmin(false);
          setRestaurantIdState(null);
          setRestaurantSlug(null);
          localStorage.removeItem('adminRestaurantId');
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadRestaurantForUser(sess.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadRestaurantForUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRestaurantIdState(null);
    setRestaurantSlug(null);
    localStorage.removeItem('adminRestaurantId');
  };

  return (
    <AuthContext.Provider value={{
      user, session, isAdmin,
      restaurantId, restaurantSlug,
      loading, setRestaurantId,
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};