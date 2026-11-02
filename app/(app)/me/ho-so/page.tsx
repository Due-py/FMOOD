import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { resolveAvatar } from "@/lib/avatar-server";
import { BackToMe, MeSubHeader } from "../MeBox";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = { title: "Hồ sơ của tôi" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  const avatar = await resolveAvatar(profile.avatar);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackToMe />
        <MeSubHeader emoji="🪪" tint="bg-c1" title="Hồ sơ của mình" lead="Góc riêng của bạn" />
      </div>
      <ProfileEditor
        avatar={avatar}
        currentAvatar={profile.avatar}
        nickname={profile.nickname}
        fullName={profile.full_name ?? ""}
      />
    </div>
  );
}
