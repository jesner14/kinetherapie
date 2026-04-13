import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const LOGO_KEY = "global.logo_url";
const FALLBACK = "/logo.png";

// Module-level cache so all components share the same value
let cachedUrl: string | null = null;
const listeners: Set<(url: string) => void> = new Set();

function notify(url: string) {
  cachedUrl = url;
  listeners.forEach((fn) => fn(url));
}

export async function uploadLogo(file: File): Promise<{ url?: string; error?: string }> {
  const ext = file.name.split(".").pop();
  const fileName = `branding/logo-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("gallery1")
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  const { data: urlData } = supabase.storage.from("gallery1").getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  const { error: dbErr } = await supabase
    .from("site_content")
    .upsert(
      {
        id: LOGO_KEY,
        page: "global",
        section: "brand",
        key: "logo_url",
        value: publicUrl,
        type: "image",
        label: "Logo du cabinet",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (dbErr) return { error: dbErr.message };

  notify(publicUrl);
  return { url: publicUrl };
}

export function useLogo(): string {
  const [url, setUrl] = useState<string>(cachedUrl ?? FALLBACK);

  useEffect(() => {
    // Already cached — nothing to do
    if (cachedUrl !== null) {
      setUrl(cachedUrl);
      return;
    }

    // Fetch from DB once
    supabase
      .from("site_content")
      .select("value")
      .eq("id", LOGO_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const resolved = data?.value || FALLBACK;
        notify(resolved);
        setUrl(resolved);
      });

    // Subscribe to future updates (other admin uploads)
    listeners.add(setUrl);
    return () => { listeners.delete(setUrl); };
  }, []);

  return url;
}
