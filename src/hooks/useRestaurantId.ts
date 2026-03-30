import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RestaurantInfo {
  id: string;
  slug: string;
  name: string;
}

/**
 * Resolves restaurant by slug from URL param (/r/:slug).
 * Never falls back to "first in DB" — each site loads only its own data.
 */
export function useRestaurantId() {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No slug in URL");
      setLoading(false);
      return;
    }

    supabase
      .from("restaurants")
      .select("id, slug, name")
      .eq("slug", slug)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError(`Restaurant not found: ${slug}`);
        } else {
          setRestaurant(data as RestaurantInfo);
          setRestaurantId((data as RestaurantInfo).id);
        }
        setLoading(false);
      });
  }, [slug]);

  return { restaurantId, restaurant, slug, loading, error };
}
