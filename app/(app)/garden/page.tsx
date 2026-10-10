import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getGarden } from "@/lib/garden";
import { PageHeader } from "@/components/PageHeader";
import { GardenView } from "./GardenView";

export const metadata: Metadata = { title: "Khu vườn" };

export default async function GardenPage() {
  const profile = await requireProfile();
  const garden = await getGarden(profile.id);

  return (
    <>
      <PageHeader eyebrow="Chăm cây bằng thói quen tốt" title="Khu vườn" />
      <GardenView garden={garden} />
    </>
  );
}
