import "server-only";
import { dayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// KHU VƯỜN: học sinh nhận "giọt nước" khi
//  - đánh dấu một thói quen trong ngày (+1 mỗi lần)
//  - có ít nhất một lần check-in trong ngày (+1 mỗi ngày)
// Cây lớn dần theo số giọt nước. Khi nở hoa có thể "thu hoạch" vào bộ sưu tập
// và trồng cây mới. Admin quản lý các loại cây và số giọt cần cho từng giai đoạn.

export type Stage = { emoji: string; label: string; points: number };
export type Plant = { id: string; name: string; stages: Stage[]; active?: boolean; sort_order?: number };

export type GardenState = {
  plants: Plant[];
  plant: Plant | null;
  /** tổng giọt nước từng nhận */
  earned: number;
  /** giọt nước đang dùng cho cây hiện tại */
  progress: number;
  stageIndex: number;
  nextStage: Stage | null;
  canHarvest: boolean;
  harvests: { plant_name: string; plant_emoji: string; created_at: string }[];
  sources: { habitDone: number; checkinDays: number };
};

export function stageFor(stages: Stage[], points: number): number {
  let idx = 0;
  stages.forEach((s, i) => {
    if (points >= s.points) idx = i;
  });
  return idx;
}

export async function getGarden(userId: string): Promise<GardenState> {
  const supabase = await createClient();
  const [{ data: plants }, { data: profile }, { data: habits }, { data: checkins }, { data: harvests }] =
    await Promise.all([
      supabase.from("garden_plants").select("id, name, stages").eq("active", true).order("sort_order"),
      supabase.from("profiles").select("garden_plant_id").eq("id", userId).maybeSingle(),
      supabase.from("habits").select("habit_logs(day)").eq("user_id", userId),
      supabase.from("checkins").select("created_at").eq("user_id", userId),
      supabase
        .from("garden_harvests")
        .select("plant_name, plant_emoji, created_at, points_used")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const habitDone = (habits ?? []).reduce((s, h) => s + ((h.habit_logs as unknown[]) ?? []).length, 0);
  const checkinDays = new Set((checkins ?? []).map((c) => dayKey(c.created_at))).size;
  const earned = habitDone + checkinDays;
  const spent = (harvests ?? []).reduce((s, h) => s + h.points_used, 0);
  const progress = Math.max(0, earned - spent);

  const list = (plants ?? []) as Plant[];
  const plant = list.find((p) => p.id === profile?.garden_plant_id) ?? list[0] ?? null;
  const stageIndex = plant ? stageFor(plant.stages, progress) : 0;
  const last = plant ? plant.stages.length - 1 : 0;

  return {
    plants: list,
    plant,
    earned,
    progress,
    stageIndex,
    nextStage: plant && stageIndex < last ? plant.stages[stageIndex + 1] : null,
    canHarvest: Boolean(plant && stageIndex === last && plant.stages.length > 1),
    harvests: (harvests ?? []).map(({ plant_name, plant_emoji, created_at }) => ({ plant_name, plant_emoji, created_at })),
    sources: { habitDone, checkinDays },
  };
}
