-- F-Mood Demo 3: NHẬT KÝ HOẠT ĐỘNG CỦA THẦY CÔ VÀ SỐ LIỆU CHO "TỔNG QUAN APP"
-- (kế hoạch Demo 3, mục 12.1, 12.3 và 13.1)
--   nhật ký thầy cô có thêm vai trò, loại thao tác, trang, đối tượng · nhật ký chỉ thêm, không sửa, không xóa ·
--   cuộc trò chuyện ghi nguồn (bắt đầu từ đâu) · ghi lượt mở bài thư viện và việc nhỏ
--
-- File này chỉ THÊM cột / bảng mới, không đổi dữ liệu đang có. Bản đang chạy trên mạng không dùng tới
-- các cột mới nên không bị ảnh hưởng; mã mới vẫn chạy được khi chưa chạy file này (bỏ qua phần chưa có).
-- KHÔNG có cột nào chứa nội dung học sinh viết: chỉ mã (mã bài, mã việc nhỏ, mã cảnh báo...).
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

-- ───────── 1. Nhật ký thao tác của thầy cô: thêm vai trò, loại, trang, đối tượng (12.1) ─────────
-- Đối tượng chỉ là loại + mã (ví dụ alert + id cảnh báo), không bao giờ là nội dung.
alter table public.admin_audit add column if not exists actor_role text
  check (actor_role is null or length(actor_role) between 2 and 20);
alter table public.admin_audit add column if not exists kind text
  check (kind is null or length(kind) between 2 and 30);
alter table public.admin_audit add column if not exists page text
  check (page is null or length(page) <= 120);
alter table public.admin_audit add column if not exists target_type text
  check (target_type is null or length(target_type) between 2 and 30);
alter table public.admin_audit add column if not exists target_id text
  check (target_id is null or length(target_id) <= 80);

create index if not exists admin_audit_time_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_actor_idx on public.admin_audit (actor_id, created_at desc);
create index if not exists admin_audit_kind_idx on public.admin_audit (kind, created_at desc);

-- ───────── 2. Nhật ký chỉ thêm, không sửa, không xóa qua giao diện / API (12.3) ─────────
-- Bảng đã bật RLS và không có policy nào, nên học sinh, thầy cô (kể cả admin) đăng nhập đều không đọc,
-- sửa hay xóa được qua API. Thêm hai lớp chặn cho rõ: thu hồi quyền sửa / xóa, và policy "hạn chế" luôn sai.
-- Chỉ máy chủ (khóa bí mật) ghi được. Phần thầy cô giữ 12 tháng; người chịu trách nhiệm dữ liệu xóa bằng SQL.
revoke update, delete, truncate on public.admin_audit from anon, authenticated;
drop policy if exists "admin_audit: không ai sửa" on public.admin_audit;
create policy "admin_audit: không ai sửa" on public.admin_audit
  as restrictive for update to anon, authenticated using (false);
drop policy if exists "admin_audit: không ai xóa" on public.admin_audit;
create policy "admin_audit: không ai xóa" on public.admin_audit
  as restrictive for delete to anon, authenticated using (false);

-- ───────── 3. Cuộc trò chuyện bắt đầu từ đâu (13.1) ─────────
-- checkin: sau khi ghi tâm trạng · worry: từ chuyện bận lòng · practice: từ bài luyện ·
-- home: từ trang chủ · starter: bấm câu mở đầu · other: lối khác. Cuộc trò chuyện cũ để trống.
alter table public.conversations add column if not exists source text
  check (source is null or source in ('checkin', 'worry', 'practice', 'home', 'starter', 'other'));
create index if not exists conversations_created_idx on public.conversations (created_at);

-- ───────── 4. Lượt mở bài thư viện và việc nhỏ (13.1) ─────────
-- Bảng riêng (không thêm loại vào support_activity) để không đụng ràng buộc loại việc
-- mà các migration khác cũng sửa, và để lượt mở không bao giờ được tính giọt nước.
-- ref: mã bài (slug) hoặc mã việc nhỏ, không phải nội dung.
create table if not exists public.content_opens (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'tiny_action')),
  ref text not null check (length(ref) between 1 and 80),
  created_at timestamptz not null default now()
);
create index if not exists content_opens_kind_idx on public.content_opens (kind, created_at);
create index if not exists content_opens_user_idx on public.content_opens (user_id, created_at);
alter table public.content_opens enable row level security;
-- Không tạo policy nào: chỉ máy chủ ghi và đọc (trang Tổng quan app chỉ hiện số gộp).
