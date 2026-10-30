-- F-Mood Demo 2: MÂY HIỂU ĐÚNG HƠN VÀ BIẾT ĐỔI CÁCH
--   khó khăn đã xác nhận + lịch sử sửa · hỏi lại "đã thử chưa" · nút trong trò chuyện ·
--   kho việc nhỏ có mã HD · lời nhờ thầy cô 3 ý, có xem trước, "nhờ một bạn đi cùng", trạng thái đã xem
--
-- File này chỉ THÊM cột / bảng mới và thêm mã HD, "dùng khi nào", câu nhìn lại vào việc nhỏ đã có
-- (không đổi chữ, không đổi trạng thái bật / tắt của mục nào). Bản đang chạy trên mạng không dùng tới
-- các cột mới nên không bị ảnh hưởng. Chạy trong Supabase SQL Editor, hoặc: npm run db:migrate.
-- An toàn để chạy nhiều lần.
--
-- LƯU Ý cho nhóm: 7 việc nhỏ MỚI (HD01–HD05, HD27, HD28) được thêm ở trạng thái "Chỉ lớp thử",
-- tức là chỉ lớp thử (TESTANH, THUVONG, lớp mẫu) thấy, lớp 8A1 chưa thấy cho tới khi cô Thúy duyệt và bật.
-- Muốn để "Tắt" hẳn thì sửa chữ 'test' thành 'off' ở cuối các dòng insert bên dưới trước khi chạy.

-- ───────── 1. Khó khăn đã xác nhận của một chuyện bận lòng ─────────
-- Câu tóm tắt học sinh đã bấm "Đúng rồi". Mây dựa vào câu này để chọn cách giúp.
alter table public.worries add column if not exists difficulty text
  check (difficulty is null or length(difficulty) between 4 and 240);
alter table public.worries add column if not exists difficulty_at timestamptz;

-- Mỗi lần học sinh xác nhận hoặc sửa ("Chưa đúng") đều được lưu lại, để thấy cách hiểu đã đổi thế nào.
create table if not exists public.worry_revisions (
  id uuid primary key default gen_random_uuid(),
  worry_id uuid not null references public.worries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (length(text) between 1 and 300),
  action text not null check (action in ('confirmed', 'rejected')),
  source text not null check (source in ('chat', 'checkin', 'journey')),
  created_at timestamptz not null default now()
);
create index if not exists worry_revisions_worry_idx on public.worry_revisions (worry_id, created_at);
alter table public.worry_revisions enable row level security;
drop policy if exists "worry_revisions: xem của mình" on public.worry_revisions;
create policy "worry_revisions: xem của mình" on public.worry_revisions
  for select to authenticated using (user_id = (select auth.uid()));

-- ───────── 2. Hỏi lại sau 3 ngày: đã thử việc nhỏ chưa (HD06) ─────────
-- not_yet = chưa thử · no_help = thử rồi mà chưa đỡ · helped = thử rồi thấy có ích · null = không trả lời
alter table public.worry_checks add column if not exists tried text
  check (tried is null or tried in ('not_yet', 'no_help', 'helped'));
alter table public.worry_checks add column if not exists tried_action text
  check (tried_action is null or length(tried_action) between 1 and 80);

-- ───────── 3. Sổ hoạt động: thêm các nút mới (không tính giọt nước) ─────────
alter table public.support_activity drop constraint if exists support_activity_kind_check;
alter table public.support_activity
  add constraint support_activity_kind_check
  check (kind in (
    'worry_saved', 'tiny_action_done', 'followup_answered', 'told', 'topic_guess_yes', 'topic_guess_no',
    'misunderstood', 'chat_skip', 'chat_stop', 'difficulty_confirmed', 'tiny_action_skipped', 'tiny_action_reflect'
  ));

-- ───────── 4. Lời nhờ thầy cô: 3 ý, nhờ một bạn đi cùng, thầy cô đã xem ─────────
alter table public.help_requests add column if not exists difficulty text check (difficulty is null or length(difficulty) between 1 and 200);
alter table public.help_requests add column if not exists tried text check (tried is null or length(tried) between 1 and 200);
alter table public.help_requests add column if not exists want text check (want is null or length(want) between 1 and 200);
alter table public.help_requests add column if not exists with_buddy boolean not null default false;
alter table public.help_requests add column if not exists seen_at timestamptz;
alter table public.help_requests add column if not exists seen_by_name text;

-- ───────── 5. Chủ đề: khó khăn hay gặp (học sinh bấm chọn thay vì tự viết) ─────────
update public.support_content set data = data || '{"difficulties": ["Chưa ôn xong, nhiều bài quá", "Học rồi mà sợ quên", "Chưa hiểu bài", "Sợ bố mẹ thất vọng vì điểm"]}'::jsonb
  where key = 'topic.hoc-tap' and not (data ? 'difficulties');
update public.support_content set data = data || '{"difficulties": ["Giận nhau với bạn thân", "Bị bạn trêu chọc", "Không ai chơi cùng", "Hiểu lầm với bạn"]}'::jsonb
  where key = 'topic.ban-be' and not (data ? 'difficulties');
update public.support_content set data = data || '{"difficulties": ["Bố mẹ hay so sánh mình", "Bố mẹ cãi nhau", "Bị mắng vì điểm số", "Bố mẹ chưa hiểu mình"]}'::jsonb
  where key = 'topic.gia-dinh' and not (data ? 'difficulties');
update public.support_content set data = data || '{"difficulties": ["Thấy mình không giỏi gì", "Khó ngủ", "Tự trách mình nhiều", "Chưa rõ mình đang cảm thấy gì"]}'::jsonb
  where key = 'topic.ban-than' and not (data ? 'difficulties');
update public.support_content set data = data || '{"difficulties": ["Bị bình luận khó chịu", "Lướt mạng không dừng được", "Thấy thua kém người trên mạng", "Bị chế ảnh"]}'::jsonb
  where key = 'topic.mang-xa-hoi' and not (data ? 'difficulties');

-- ───────── 6. Kho việc nhỏ: mã HD, dùng khi nào, cụm từ hợp với khó khăn, câu nhìn lại ─────────
-- Việc đã có: chỉ thêm các phần mới khi chưa có mã (không đè chữ cô Thúy đã sửa).
-- Việc mới: HD01–HD05 theo hồ sơ tham vấn (HD06 là bước hỏi lại), HD27–HD28 theo khó khăn đã xác nhận.
update public.support_content set data = data || '{"code":"HD07","when":"Khi tim đập nhanh, người căng lên hoặc khó bình tĩnh.","cues":["hồi hộp","run","tim đập nhanh","căng thẳng","hoảng"],"reflect":"Sau 4 vòng thở, người bạn thấy khác lúc trước chỗ nào?"}'::jsonb
  where key = 'action.chung.hit-tho-hop' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD08","when":"Khi đầu óc rối, nhiều chuyện cùng lúc mà chưa biết bắt đầu từ đâu.","cues":["rối","nhiều chuyện","không biết bắt đầu","lộn xộn"],"reflect":"Viết ra rồi, điều nào bạn thấy mình làm được gì đó?"}'::jsonb
  where key = 'action.chung.viet-ra' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD09","when":"Khi ngồi lâu, thấy bứt rứt hoặc uể oải.","cues":["bứt rứt","uể oải","ngồi lâu","không tập trung"],"reflect":"Vận động xong, bạn thấy người nhẹ hơn hay vẫn vậy?"}'::jsonb
  where key = 'action.chung.van-dong-nhe' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD10","when":"Khi xem điện thoại nhiều và thấy mệt mắt, khó chịu.","cues":["điện thoại","lướt","mỏi mắt"],"reflect":"Lúc rời màn hình, bạn để ý được điều gì xung quanh?"}'::jsonb
  where key = 'action.chung.nghi-man-hinh' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD11","when":"Khi có một bài hay một việc lớn mà ngại bắt đầu.","cues":["ngại bắt đầu","bài dài","việc lớn","lười"],"reflect":"Phần đầu tiên có vừa sức không, hay cần chia nhỏ hơn nữa?"}'::jsonb
  where key = 'action.hoc-tap.chia-nho' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD12","when":"Khi ngồi học mà hay bị xao nhãng.","cues":["xao nhãng","không tập trung","học không vào","mất tập trung"],"reflect":"Trong 10 phút đó, điều gì làm bạn xao nhãng nhất?"}'::jsonb
  where key = 'action.hoc-tap.hoc-10-nghi-2' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD13","when":"Khi cứ nghĩ mãi về điều xấu có thể xảy ra trong học tập.","cues":["sợ trượt","sợ điểm kém","nghĩ mãi","lo xa"],"reflect":"Sau khi hỏi lại nỗi lo, bạn thấy nó chắc chắn hay chỉ là có thể?"}'::jsonb
  where key = 'action.hoc-tap.hoi-noi-lo' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD14","when":"Khi có hiểu lầm với bạn và muốn hiểu chuyện rõ hơn.","cues":["hiểu lầm","giận nhau","cãi nhau"],"reflect":"Nhìn từ phía bạn kia, bạn có thấy điều gì mới không?"}'::jsonb
  where key = 'action.ban-be.hai-phia' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD15","when":"Khi muốn làm lành nhưng chưa biết nói sao.","cues":["làm lành","giận nhau","cãi nhau","xin lỗi"],"reflect":"Đọc lại tin nhắn, bạn thấy nó có nói đúng điều bạn muốn không?"}'::jsonb
  where key = 'action.ban-be.tin-lam-lanh' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD16","when":"Khi thấy lạc lõng, chưa có ai để nói chuyện.","cues":["lạc lõng","không ai chơi","một mình","cô đơn"],"reflect":"Nghĩ về người đó, bạn có muốn nhắn hỏi thăm họ không?"}'::jsonb
  where key = 'action.ban-be.nguoi-de-chiu' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD17","when":"Khi đang bực với bố mẹ và dễ nói điều mình không muốn.","cues":["bực","cãi nhau","tức","bị mắng"],"reflect":"Lúc quay lại nói chuyện, bạn thấy bình tĩnh hơn chưa?"}'::jsonb
  where key = 'action.gia-dinh.ha-nhiet' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD18","when":"Khi muốn bố mẹ hiểu mình mà chưa biết nói thế nào.","cues":["không hiểu mình","so sánh","thất vọng","áp lực"],"reflect":"Câu bạn viết đã nói đúng điều bạn cần chưa?"}'::jsonb
  where key = 'action.gia-dinh.dieu-muon-noi' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD19","when":"Khi đã biết muốn nói gì và cần tìm lúc thích hợp.","cues":["muốn nói với bố mẹ","muốn nói với mẹ","muốn nói với bố","chưa dám nói"],"reflect":"Bạn đã chọn được lúc nào để nói chưa?"}'::jsonb
  where key = 'action.gia-dinh.chon-luc-noi' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD20","when":"Khi thấy mình kém cỏi, không làm được gì.","cues":["kém cỏi","vô dụng","không giỏi","tự ti"],"reflect":"Đọc lại 3 điều đó, bạn thấy thế nào về mình hôm nay?"}'::jsonb
  where key = 'action.ban-than.ba-dieu-lam-duoc' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD21","when":"Khi đang tự trách mình nhiều.","cues":["tự trách","lỗi của mình","ghét bản thân"],"reflect":"Câu đáp bạn viết cho mình nghe có dễ chịu hơn câu lúc đầu không?"}'::jsonb
  where key = 'action.ban-than.noi-nhu-ban-than' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD22","when":"Khi người căng cứng hoặc khó thả lỏng.","cues":["căng cứng","khó thả lỏng","mỏi người"],"reflect":"Chỗ nào trong người bạn thấy dễ chịu hơn sau khi quét?"}'::jsonb
  where key = 'action.ban-than.quet-co-the' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD23","when":"Khi khó ngủ vì cứ nghĩ ngợi.","cues":["mất ngủ","khó ngủ","thức khuya","ngủ không được"],"reflect":"Tối nay bạn đi ngủ có dễ hơn chút nào không?"}'::jsonb
  where key = 'action.ban-than.chuan-bi-ngu' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD24","when":"Khi thông báo cứ kéo bạn vào điện thoại.","cues":["thông báo","nghiện điện thoại","không dừng được"],"reflect":"30 phút không thông báo, bạn thấy thế nào?"}'::jsonb
  where key = 'action.mang-xa-hoi.tat-thong-bao' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD25","when":"Khi xem mạng xong lại thấy mình thua kém người khác.","cues":["thua kém","ghen tị","so sánh với người trên mạng"],"reflect":"Bỏ bớt những thứ đó, lúc lướt mạng bạn có dễ chịu hơn không?"}'::jsonb
  where key = 'action.mang-xa-hoi.loc-tai-khoan' and not (data ? 'code');
update public.support_content set data = data || '{"code":"HD26","when":"Khi bị nói xấu, chế ảnh hay nhắn tin khó chịu trên mạng.","cues":["chế ảnh","nói xấu","bình luận","bị chửi","tin nhắn khó chịu"],"reflect":"Bạn đã chọn được người lớn nào để cho xem chưa?"}'::jsonb
  where key = 'action.mang-xa-hoi.giu-bang-chung' and not (data ? 'code');
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.chung.goi-ten-cam-xuc', 'tiny_action', null, 70, '{"code":"HD01","title":"Gọi tên điều đang cảm thấy","minutes":2,"when":"Khi bạn chưa rõ mình đang cảm thấy gì.","cues":["chưa rõ","không biết mình","khó chịu mà không biết","không biết vì sao","lạ lạ"],"steps":["Đọc chậm các từ: lo, buồn, bực, mệt, chán, chưa rõ.","Chọn một từ gần nhất, hoặc giữ là “chưa rõ” cũng được.","Nếu muốn, chọn mạnh hay nhẹ từ 1 tới 5.","Viết một điều đang xảy ra quanh cảm giác đó, nếu bạn muốn."],"reflect":"Từ bạn vừa chọn đã đúng với cảm giác của bạn chưa?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.hoc-tap.su-viec-va-suy-nghi', 'tiny_action', 'hoc-tap', 71, '{"code":"HD02","title":"Tách điều đã xảy ra và điều mình đang nghĩ","minutes":3,"when":"Khi bạn đang lo một điều chưa xảy ra và muốn xem lại nó. Chỉ làm khi bạn muốn.","cues":["chắc chắn sẽ","chắc sẽ","sợ bố mẹ thất vọng","sợ bị chê","nghĩ là mình"],"maxLevel":3,"steps":["Viết: “Điều đã xảy ra là…”.","Viết: “Điều mình đang nghĩ sẽ xảy ra là…”.","Nếu muốn, viết thêm một cách hiểu khác. Chưa nghĩ ra cũng không sao."],"reflect":"Sau khi tách hai phần, bạn muốn làm rõ điều gì tiếp?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.hoc-tap.buoc-vua-suc', 'tiny_action', 'hoc-tap', 72, '{"code":"HD03","title":"Chọn một bước học vừa sức","minutes":4,"when":"Khi có nhiều bài, chưa ôn xong và không biết làm gì trước.","cues":["chưa ôn xong","chưa ôn","chưa học","nhiều bài","quá nhiều việc","nhiều việc","không kịp","chưa làm xong","dồn"],"steps":["Viết tối đa 3 việc đang vướng.","Chọn một việc cần làm trước.","Chọn phần nhỏ nhất của việc đó, ví dụ đọc đề câu 1 và đánh dấu chỗ chưa hiểu.","Chọn lúc làm và cách biết là đã xong."],"reflect":"Bước này vừa sức chưa, hay cần chia nhỏ hơn hoặc nhờ ai giúp?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.chung.tam-dung', 'tiny_action', null, 73, '{"code":"HD04","title":"Tạm dừng và chọn điều cần lúc này","minutes":2,"when":"Khi bạn thấy mệt, khó tiếp tục và muốn nghỉ ngắn.","cues":["mệt","kiệt sức","muốn nghỉ","không nổi nữa","đuối"],"steps":["Rời màn hình, ngồi thoải mái hoặc uống ngụm nước.","Chọn một việc dễ chịu và an toàn ngay tại chỗ.","Khi muốn quay lại, chọn: làm tiếp, đổi việc khác, hay tìm người giúp."],"reflect":"Lúc này bạn muốn nghỉ thêm hay chọn bước tiếp theo?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.chung.loi-nho-giup', 'tiny_action', null, 74, '{"code":"HD05","title":"Chuẩn bị lời nhờ thầy cô giúp","minutes":4,"linkTo":"help","when":"Khi bạn muốn nhờ người lớn giúp nhưng khó mở lời.","cues":["ngại hỏi","không dám hỏi","muốn nhờ","nhờ cô","nhờ thầy","không biết nói sao"],"steps":["Chọn người bạn muốn nhờ.","Viết 3 ý: mình đang khó chỗ nào, mình đã thử gì, mình muốn được giúp gì.","Xem lại, bỏ điều bạn không muốn chia sẻ, rồi tự quyết định gửi hay không."],"reflect":"Lời nhờ đã đúng ý và chỉ có điều bạn muốn chia sẻ chưa?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.hoc-tap.tu-nho-lai', 'tiny_action', 'hoc-tap', 75, '{"code":"HD27","title":"Tự nhớ lại, không nhìn vở","minutes":5,"when":"Khi bạn đã học rồi nhưng sợ vào phòng thi sẽ quên.","cues":["sợ quên","quên hết","học rồi","ôn rồi","không nhớ","nhớ công thức","hay quên"],"steps":["Gấp vở lại.","Trong 3 phút, viết ra mọi thứ bạn nhớ về một phần, ví dụ công thức hay ý chính.","Mở vở đối chiếu, khoanh phần bạn quên.","Chỉ ôn lại phần đã khoanh, rồi thử viết lại lần nữa."],"reflect":"Lần viết thứ hai bạn nhớ được nhiều hơn chưa?"}'::jsonb, 'test')
  on conflict (key) do nothing;
insert into public.support_content (key, kind, topic, sort_order, data, status)
  values ('action.hoc-tap.cho-chua-hieu', 'tiny_action', 'hoc-tap', 76, '{"code":"HD28","title":"Đánh dấu chỗ chưa hiểu, chuẩn bị một câu hỏi","minutes":4,"linkTo":"help","when":"Khi bạn chưa hiểu bài, làm mãi vẫn không biết cách.","cues":["chưa hiểu","không hiểu","không biết làm","khó hiểu","theo không kịp","mất gốc"],"steps":["Mở bài, đánh dấu ? ở chỗ đầu tiên bạn không theo kịp.","Viết một câu: “Mình chưa hiểu bước … ở câu …”.","Chọn hỏi ai: thầy cô, hoặc một bạn học chắc phần này.","Nếu muốn, soạn lời nhờ thầy cô ở trang Cần giúp."],"reflect":"Câu hỏi của bạn đã đủ rõ để người khác biết bạn vướng ở đâu chưa?"}'::jsonb, 'test')
  on conflict (key) do nothing;
