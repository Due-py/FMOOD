-- F-Mood Demo 2.1: NHẬT KÝ (Duy duyệt 31/10 khuya)
--
-- Học sinh chọn một mẫu câu có sẵn ("câu mở đầu" hoặc "câu hỏi nổi bật") để bắt đầu một trang nhật ký.
-- Admin quản lý mẫu ở trang thầy cô "Mẫu câu nhật ký" (thêm, sửa, tạm ẩn, xóa, sắp thứ tự; thấy số lần đã dùng).
--
-- NỘI DUNG NHẬT KÝ LÀ RIÊNG TƯ: chỉ chính học sinh đọc được (RLS). Thầy cô và admin không đọc được nội dung.
-- Ngoại lệ đã báo trước cho học sinh trên trang nhật ký: nội dung đi qua lớp kiểm tra an toàn như tin nhắn trò chuyện;
-- có dấu hiệu nguy hiểm thì thầy cô nhận cảnh báo kèm đoạn trích (giống "chuyện bận lòng").
-- Máy chủ ghi bằng quyền quản trị (để kiểm tra an toàn trước khi lưu và đếm lượt dùng mẫu).
--
-- Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate. An toàn để chạy nhiều lần (mẫu câu chỉ nạp khi bảng còn trống).
-- Chưa chạy file này thì trang nhật ký báo "chưa sẵn sàng", các phần khác vẫn chạy.

create table if not exists public.journal_prompts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mo-dau', 'noi-bat')),
  text text not null check (length(text) between 3 and 200),
  emoji text not null default '' check (length(emoji) <= 16),
  active boolean not null default true,
  sort_order int not null default 100,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.journal_prompts enable row level security;
drop policy if exists "journal_prompts: đọc mẫu đang dùng" on public.journal_prompts;
create policy "journal_prompts: đọc mẫu đang dùng" on public.journal_prompts
  for select to authenticated using (active);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id uuid references public.journal_prompts (id) on delete set null,
  prompt_text text not null default '' check (length(prompt_text) <= 200),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_user_idx on public.journal_entries (user_id, created_at desc);
alter table public.journal_entries enable row level security;
drop policy if exists "journal_entries: của mình" on public.journal_entries;
create policy "journal_entries: của mình" on public.journal_entries
  for select to authenticated using (user_id = (select auth.uid()));

-- trò chuyện mở từ một trang nhật ký: thêm nguồn "journal" (0019)
alter table public.conversations drop constraint if exists conversations_source_check;
alter table public.conversations add constraint conversations_source_check
  check (source is null or source in ('checkin', 'worry', 'practice', 'home', 'starter', 'journal', 'other'));

-- mẫu câu ban đầu (theo bản Duy gửi 31/10); chỉ nạp khi chưa có mẫu nào
insert into public.journal_prompts (kind, text, emoji, sort_order)
select v.kind, v.text, v.emoji, v.sort_order
from (values
  ('mo-dau', 'Mình biết ơn vì…', '💗', 10),
  ('mo-dau', 'Điều mình mong chờ là…', '🔮', 20),
  ('mo-dau', 'Hôm nay mình học được…', '💡', 30),
  ('mo-dau', 'Mình cảm thấy vui khi…', '🤩', 40),
  ('mo-dau', 'Mình muốn tập trung vào…', '🗓️', 50),
  ('mo-dau', 'Mình thích được ở cạnh…', '💕', 60),
  ('mo-dau', 'Mình tin vào bản thân vì…', '🌟', 70),
  ('mo-dau', 'Mình tự hào về…', '🏆', 80),
  ('mo-dau', 'Một thử thách mình đã vượt qua là…', '⛰️', 90),
  ('mo-dau', 'Mình chăm sóc bản thân bằng cách…', '🤗', 100),
  ('mo-dau', 'Điều mình thích ở bản thân là…', '💖', 110),
  ('mo-dau', 'Mình cảm thấy tự tin về…', '🌞', 120),
  ('mo-dau', 'Mình đã cười thật vui khi…', '🥳', 130),
  ('mo-dau', 'Mình lấy cảm hứng từ…', '✨', 140),
  ('mo-dau', 'Mình cảm thấy được yêu thương khi…', '🥰', 150),
  ('mo-dau', 'Mình có động lực để…', '🚀', 160),
  ('mo-dau', 'Mình cảm thấy háo hức về…', '🎉', 170),
  ('mo-dau', 'Mình muốn giỏi hơn ở…', '🎯', 180),
  ('mo-dau', 'Mình thấy may mắn vì…', '🍀', 190),
  ('mo-dau', 'Mình muốn thử một điều mới, đó là…', '🧭', 200),
  ('mo-dau', 'Điều mình đang lo là…', '🌧️', 210),
  ('mo-dau', 'Hôm nay có một chuyện làm mình buồn…', '💧', 220),
  ('mo-dau', 'Mình thấy khó chịu khi…', '🌀', 230),
  ('noi-bat', 'Thành viên nào trong gia đình khiến bạn biết ơn nhất? Vì sao?', '🏠', 300),
  ('noi-bat', 'Tưởng tượng 5 năm nữa — điều gì khiến bạn háo hức nhất?', '🔭', 310),
  ('noi-bat', 'Góc nào trong nhà khiến bạn thấy thoải mái nhất? Vì sao?', '🛋️', 320),
  ('noi-bat', 'Gần đây, điều gì giúp bạn cảm thấy tự tin hơn về chính mình?', '🏅', 330),
  ('noi-bat', 'Hôm nay có lúc nào bạn thấy căng thẳng không? Lúc đó cơ thể bạn thế nào?', '🫧', 340),
  ('noi-bat', 'Có ai hôm nay làm bạn thấy được giúp đỡ? Bạn muốn nói gì với người đó?', '🤝', 350)
) as v(kind, text, emoji, sort_order)
where not exists (select 1 from public.journal_prompts);
