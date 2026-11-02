import { getSupportContacts } from "@/lib/support";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

/** số cấp cứu: nút gọi đỏ (màu đỏ chỉ dành cho việc gấp) */
const EMERGENCY = "115";

const digits = (phone: string) => phone.replace(/\s/g, "");

function iconFor(phone: string | undefined, school: boolean): string {
  if (school) return "🏫";
  const d = phone ? digits(phone) : "";
  if (d === EMERGENCY) return "🚑";
  if (d === "111") return "🧒";
  return "☎️";
}

/**
 * Thẻ liên hệ khẩn cấp của trang Cần giúp (giao diện vui, mẫu can-giup.html): nền hồng ấm viền hồng, mỗi người/đường dây
 * một dòng trắng có ô biểu tượng, nút gọi to (cao 48px) dễ bấm; riêng 115 là nút đỏ và dòng có viền đỏ nhạt.
 * Cùng nguồn dữ liệu với components/SupportCard (getSupportContacts, admin sửa ở An toàn → Khẩn cấp); chỉ khác cách trình
 * bày cho trang khẩn cấp. Trang khác vẫn dùng SupportCard.
 */
export async function UrgentContacts() {
  const { school, hotlines } = await getSupportContacts();
  const rows = [{ ...school, school: true }, ...hotlines.map((h) => ({ ...h, school: false }))];

  return (
    <section aria-label="Thông tin hỗ trợ" className="rounded-[1.75rem] border-2 border-danger/25 bg-danger-soft/60 p-4 sm:p-5">
      <h2 className="font-display text-[1.4rem] font-extrabold leading-tight tracking-tight">Bạn không phải một mình 🤍</h2>
      <p className="mt-1 text-sm text-muted">Những người dưới đây luôn sẵn lòng giúp bạn. Gọi hoặc tìm đến họ ngay khi cần.</p>

      <ul className="mt-3.5 grid gap-2.5">
        {rows.map((c) => {
          const sos = c.phone ? digits(c.phone) === EMERGENCY : false;
          return (
            <li
              key={c.name}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[1.4rem] bg-surface p-3 sm:flex-nowrap sm:px-3.5",
                sos && "ring-2 ring-danger/40",
              )}
            >
              <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-[1.4rem]", sos ? "bg-danger-soft" : "bg-sky")}>
                {iconFor(c.phone, c.school)}
              </span>
              <span className="min-w-0 flex-[1_1_calc(100%-3.5rem)] sm:flex-1">
                <span className={cn("block font-bold leading-snug", c.school && "text-brand-strong dark:text-brand")}>{c.name}</span>
                <span className="block text-[13px] leading-snug text-muted">{c.detail}</span>
              </span>
              {c.phone && (
                <a
                  href={`tel:${digits(c.phone)}`}
                  aria-label={`Gọi ${c.name}: ${c.phone}`}
                  className={cn(
                    "inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full border-2 px-5 py-2 font-extrabold whitespace-nowrap transition active:translate-y-0.5 sm:w-auto",
                    sos
                      ? "border-[color-mix(in_srgb,var(--danger)_70%,black)] bg-danger text-lg text-white shadow-[0_3px_0_color-mix(in_srgb,var(--danger)_70%,black)] active:shadow-[0_1px_0_color-mix(in_srgb,var(--danger)_70%,black)] dark:text-danger-soft"
                      : "border-brand-edge bg-brand text-base text-brand-ink shadow-[0_3px_0_var(--brand-edge)] active:shadow-[0_1px_0_var(--brand-edge)]",
                  )}
                >
                  <PhoneIcon size={18} />
                  {c.phone}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
