import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getGarden } from "@/lib/garden";
import { JourneyShell } from "@/components/JourneyShell";
import { GardenView } from "./GardenView";

export const metadata: Metadata = { title: "Khu vườn" };

export default async function GardenPage() {
  const profile = await requireProfile();
  const garden = await getGarden(profile.id);

  return (
    <JourneyShell active="/garden">
      <p className="mb-6 text-muted">Chăm cây bằng thói quen tốt.</p>
      <GardenView garden={garden} />
    </JourneyShell>
  );
}
