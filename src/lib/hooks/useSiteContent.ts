import { useState, useEffect, useCallback } from "react";
import { supabase, SiteContent } from "../supabase";

// Cache module-level pour éviter des re-fetches inutiles entre composants
const cache: Record<string, { data: Record<string, string>; ts: number }> = {};
const CACHE_TTL = 60_000; // 1 minute

/**
 * Retourne un objet { "home.hero.slide1.title": "valeur", ... }
 * pour toutes les entrées de la page demandée.
 * Si une clé est absente en DB, la valeur par défaut `defaults` est utilisée.
 */
export function useSiteContent(page: string, defaults: Record<string, string> = {}) {
  const [content, setContent] = useState<Record<string, string>>(() => {
    if (cache[page] && Date.now() - cache[page].ts < CACHE_TTL) {
      return { ...defaults, ...cache[page].data };
    }
    return defaults;
  });
  const [loading, setLoading] = useState(() => {
    return !(cache[page] && Date.now() - cache[page].ts < CACHE_TTL);
  });
  const [rawItems, setRawItems] = useState<SiteContent[]>([]);

  const fetchContent = useCallback(async () => {
    const now = Date.now();
    if (cache[page] && now - cache[page].ts < CACHE_TTL) {
      setContent({ ...defaults, ...cache[page].data });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .eq("page", page);

    if (error) {
      console.error("[useSiteContent] fetch error:", error.message);
      setLoading(false);
      return;
    }

    const map: Record<string, string> = {};
    for (const item of data as SiteContent[]) {
      map[item.id] = item.value;
    }
    cache[page] = { data: map, ts: now };
    setContent({ ...defaults, ...map });
    setRawItems(data as SiteContent[]);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  /**
   * Met à jour une entrée dans la DB et revalide le cache.
   * Réservé aux doctors (RLS en place côté Supabase).
   */
  const updateContent = useCallback(
    async (id: string, value: string): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from("site_content")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) return { error: error.message };

      // Invalider le cache et mettre à jour l'état local
      if (cache[page]) {
        cache[page].data[id] = value;
      }
      setContent((prev) => ({ ...prev, [id]: value }));
      return { error: null };
    },
    [page]
  );

  /** Recharge depuis la DB (force re-fetch) */
  const refetch = useCallback(() => {
    delete cache[page];
    fetchContent();
  }, [page, fetchContent]);

  return { content, loading, rawItems, updateContent, refetch };
}

/** Charge toutes les pages en une seule requête (pour l'admin) */
export function useAllSiteContent() {
  const [items, setItems] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .order("page")
      .order("section")
      .order("key");

    if (error) {
      console.error("[useAllSiteContent] fetch error:", error.message);
    } else {
      setItems(data as SiteContent[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateContent = useCallback(
    async (id: string, value: string): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from("site_content")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) return { error: error.message };

      // Invalider tous les caches de page
      Object.keys(cache).forEach((k) => delete cache[k]);

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, value } : item))
      );
      return { error: null };
    },
    []
  );

  return { items, loading, updateContent, refetch: fetchAll };
}
