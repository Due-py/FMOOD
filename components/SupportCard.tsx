import { getSupportContacts } from "@/lib/support";
import { PhoneIcon, ShieldIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

type Props = {
  /** urgent: viền đỏ, dùng khi có dấu hiệu nguy hiểm */
  tone?: "urgent" | "gentle";
  /** hiện dòng minh bạch "thầy cô đã được báo" */
  teacherNotified?: boolean;
  className?: string;
};

/** Thẻ hỗ trợ khẩn cấp: đường dây nóng và phòng tham vấn của trường. */
export async function SupportCard({ tone = "gentle", teacherNotified = false, className }: Props) {
  const { school, hotlines } = await getSupportContacts();

  return (
    <section
      aria-label="Thông tin hỗ trợ"
      className={cn(
        "rounded-[var(--radius-card)] border p-5",
        tone === "urgent" ? "border-danger/40 bg-danger-soft" : "border-line bg-sky",
        className,
      )}
    >
      <h3 className="font-display text-lg font-bold tracking-tight">
        {tone === "urgent" ? "Bạn không phải một mình" : "Khi bạn cần ai đó lắng nghe"}
      </h3>
      <p className="mt-1 text-sm text-muted">
        Những người dưới đây luôn sẵn lòng giúp bạn. Gọi hoặc tìm đến họ ngay khi cần.
      </p>

      <ul className="mt-4 space-y-2">
        <ContactRow name={school.name} detail={school.detail} phone={school.phone} highlight />
        {hotlines.map((h) => (
          <ContactRow key={h.name} {...h} />
        ))}
      </ul>

      {teacherNotified && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface/70 p-3 text-sm">
          <ShieldIcon size={18} className="mt-0.5 shrink-0 text-brand-strong dark:text-brand" />
          <span>
            Để bạn được hỗ trợ kịp thời, <strong>thầy cô phụ trách đã được báo</strong>. Thầy cô
            chỉ thấy đoạn đáng lo này, không đọc được các cuộc trò chuyện khác của bạn.
          </span>
        </p>
      )}
    </section>
  );
}

function ContactRow({
  name,
  detail,
  phone,
  highlight,
}: {
  name: string;
  detail: string;
  phone?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", highlight && "text-brand-strong dark:text-brand")}>{name}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-ink"
        >
          <PhoneIcon size={16} />
          {phone}
        </a>
      )}
    </li>
  );
}
