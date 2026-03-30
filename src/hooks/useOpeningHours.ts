import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

type DayHours = { open: string; close: string; closed: boolean };
type OpeningHours = Record<string, DayHours>;

function isOpenNow(hours: OpeningHours): boolean {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const dayHours = hours[dayName];

  if (!dayHours || dayHours.closed) return false;

  const [openH, openM] = dayHours.open.split(":").map(Number);
  const [closeH, closeM] = dayHours.close.split(":").map(Number);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

function getTodayHours(hours: OpeningHours): string | null {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const dayHours = hours[dayName];
  if (!dayHours || dayHours.closed) return null;
  return `${dayHours.open} - ${dayHours.close}`;
}

export function useOpeningHours(restaurantId: string | null) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [todayHours, setTodayHours] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    const check = async () => {
      const { data } = await db
        .from("restaurant_settings")
        .select("opening_hours, is_accepting_orders")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (!data) {
        setIsOpen(true); // אם אין הגדרות — פתוח כברירת מחדל
        setLoading(false);
        return;
      }

      // אם יש שדה ידני is_accepting_orders — משתמשים בו
      if (data.is_accepting_orders === false) {
        setIsOpen(false);
        setLoading(false);
        return;
      }

      // בדיקה לפי שעות פתיחה
      const hours = data.opening_hours as OpeningHours | null;
      if (hours) {
        setIsOpen(isOpenNow(hours));
        setTodayHours(getTodayHours(hours));
      } else {
        setIsOpen(true);
      }
      setLoading(false);
    };

    check();

    // בדוק מחדש כל דקה
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  return { isOpen, todayHours, loading };
}
