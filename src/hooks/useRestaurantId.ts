import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the first restaurant's ID (single-restaurant mode).
 * Creates it if none exists.
 */
export function useRestaurantId() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (data) {
        setRestaurantId(data.id);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { restaurantId, loading };
}
