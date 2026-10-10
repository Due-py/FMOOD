import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Scenario = { id: string; title: string; triggers: string[]; guidance: string; active: boolean };

const MAX_MATCHES = 2;

/** Kịch bản nào khớp với tin nhắn (theo cụm từ nhận diện). Tối đa 2 kịch bản. */
export function matchScenarios(text: string, scenarios: Scenario[]): Scenario[] {
  const normalized = text.toLowerCase().normalize("NFC");
  return scenarios
    .filter((s) => s.active)
    .map((s) => ({
      s,
      hits: s.triggers.filter((t) => t.trim() && normalized.includes(t.trim().toLowerCase().normalize("NFC"))).length,
    }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_MATCHES)
    .map((x) => x.s);
}

export async function activeScenarios(): Promise<Scenario[]> {
  const { data } = await createAdminClient()
    .from("scenarios")
    .select("id, title, triggers, guidance, active")
    .eq("active", true);
  return (data ?? []) as Scenario[];
}
