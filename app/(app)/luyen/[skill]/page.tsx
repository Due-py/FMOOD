import { notFound, redirect } from "next/navigation";
import { skillFromSlug } from "@/lib/practice/shared";
import { subskillHref } from "@/lib/sel/casel";

/**
 * Đường cũ /luyen/<kỹ năng> (kể cả mã cũ trong link đã lưu, đọc qua lib/sel/legacy.ts): chuyển sang /ky-nang/<kỹ năng>.
 * Giữ nguồn `?tu=` nếu có. /luyen/bai/<mã bài> là thư mục riêng, không qua đây.
 */
export default async function OldSkillPage({ params, searchParams }: PageProps<"/luyen/[skill]">) {
  const skill = skillFromSlug((await params).skill);
  if (!skill) notFound();
  const { tu } = await searchParams;
  redirect(`${subskillHref(skill)}${typeof tu === "string" ? `?tu=${encodeURIComponent(tu)}` : ""}`);
}
