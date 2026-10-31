-- F-Mood Demo 2.1: HỌC SINH CHỈ ĐỌC ĐƯỢC BÀI ĐÃ ĐĂNG VÀ ĐÃ DUYỆT (Duy chọn 31/10 khuya; lib/lessons.ts)
--
-- Ứng dụng đã lọc bài chưa duyệt ở mọi trang học sinh (commit aaf763b). File này chặn thêm ở tầng dữ liệu (RLS), để
-- học sinh không đọc được bài chưa duyệt kể cả khi gọi thẳng vào cơ sở dữ liệu bằng tài khoản của mình.
-- Chỉ đổi quyền ĐỌC của tài khoản đăng nhập (học sinh); không sửa hay xóa dữ liệu. Trang thầy cô và admin đọc bằng quyền
-- máy chủ nên không bị ảnh hưởng. Bài của lớp (GVCN soạn) vẫn chỉ học sinh lớp đó đọc được, như 0012.
-- Cần đã chạy 0015 (cột reviewed_at). Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần.
-- Muốn quay lại như cũ: chạy lại đoạn tạo policy trong 0012_trang_thay_co.sql.

drop policy if exists "lessons: học sinh đọc bài đã đăng" on public.lessons;
drop policy if exists "lessons: học sinh đọc bài đã đăng và đã duyệt" on public.lessons;
create policy "lessons: học sinh đọc bài đã đăng và đã duyệt" on public.lessons
  for select to authenticated using (
    published
    and reviewed_at is not null
    and (
      class_id is null
      or class_id = (select p.class_id from public.profiles p where p.id = (select auth.uid()))
    )
  );
