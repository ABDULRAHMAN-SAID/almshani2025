import type { AwarenessArticle } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_AWARENESS_LIBRARY } from "./mockData";
import { toAwarenessArticle } from "./rowMappers";
import { supabase } from "./supabase";

export async function fetchAwarenessLibrary(): Promise<AwarenessArticle[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_AWARENESS_LIBRARY].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  const { data } = await supabase
    .from("awareness_articles")
    .select("*")
    .order("published_at", { ascending: false });
  return (data ?? []).map(toAwarenessArticle);
}

export async function fetchAwarenessArticle(id: string): Promise<AwarenessArticle | null> {
  if (USE_MOCK_DATA) {
    return MOCK_AWARENESS_LIBRARY.find((article) => article.id === id) ?? null;
  }
  const { data } = await supabase.from("awareness_articles").select("*").eq("id", id).maybeSingle();
  return data ? toAwarenessArticle(data) : null;
}
