-- F-Mood Demo 2 bổ sung: NHẬT KÝ HOẠT ĐỘNG HỌC SINH TRONG ĐỢT CHẠY THỬ (kế hoạch Demo 3, mục 12.4)
--
-- Chỉ ghi VIỆC LÀM (đăng nhập, ghi tâm trạng, bắt đầu trò chuyện, gửi tin nhắn, bài luyện, việc nhỏ,
-- bài đo, lời nhờ, Cần giúp) và thời điểm. KHÔNG có cột nào chứa nội dung học sinh viết,
-- cảm xúc đã chọn, chủ đề hay mức lo.
-- Chỉ máy chủ ghi; không ai đọc qua RLS (trang admin đọc bằng quyền máy chủ).
-- Máy chủ chỉ ghi từ 03/11 đến hết 12/11/2026 (lib/activity-log.ts). Xóa toàn bộ ngày 15/12/2026.
--
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

create table if not exists public.student_activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  kind text not null check (length(kind) between 2 and 40),
  /** chỉ mã ngắn (ví dụ K3, TL09, HD03, mã phiếu), không bao giờ là chữ học sinh viết */
  ref text check (ref is null or length(ref) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists student_activity_log_user_idx on public.student_activity_log (user_id, created_at);
create index if not exists student_activity_log_class_idx on public.student_activity_log (class_id, created_at);
create index if not exists student_activity_log_kind_idx on public.student_activity_log (kind, created_at);

alter table public.student_activity_log enable row level security;
-- Không tạo policy nào: học sinh, thầy cô đều không đọc / ghi trực tiếp. Chỉ máy chủ (khóa bí mật) dùng bảng này.
