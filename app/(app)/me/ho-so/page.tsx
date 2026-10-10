import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { resolveAvatar } from "@/lib/avatar-server";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = { title: "Hồ sơ của tôi" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  const avatar = await resolveAvatar(profile.avatar);

  return (
    <div>
      <Link href="/me" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Tôi
      </Link>
      <PageHeader eyebrow="Góc riêng của bạn" title="Hồ sơ của tôi" />
      <ProfileEditor
        avatar={avatar}
        currentAvatar={profile.avatar}
        nickname={profile.nickname}
        fullName={profile.full_name ?? ""}
      />
    </div>
  );
}
