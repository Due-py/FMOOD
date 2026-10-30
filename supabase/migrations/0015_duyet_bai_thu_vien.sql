-- F-Mood Demo 2: DUYỆT BÀI THƯ VIỆN
-- Mỗi bài trong thư viện ghi được ai đã duyệt, duyệt ngày nào (nguồn của bài đã có ở cột `source`).
-- Trang thầy cô "Duyệt bài thư viện" (admin và phòng tham vấn) liệt kê bài đã duyệt / chưa duyệt.
--
-- File này chỉ THÊM cột mới, không sửa hay xóa dữ liệu đang có: mọi bài hiện có ở trạng thái "chưa duyệt".
-- Bản đang chạy trên mạng không dùng tới các cột này nên không bị ảnh hưởng.
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.

alter table public.lessons add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.lessons add column if not exists reviewed_by_name text;
alter table public.lessons add column if not exists reviewed_at timestamptz;
