# Đối chiếu yêu cầu với mã nguồn Demo 2.1

Lập ngày 31/10/2026 theo yêu cầu "CẬP NHẬT CUỐI CÙNG NGÀY 31/10/2026" (phản biện của ChatGPT, Duy chấp nhận) và kế hoạch `ke-hoach-2026-10-31-demo-3-luyen-ky-nang.md`. Mã nguồn ở nhánh `demo-2.1` (commit ghi ở cuối tài liệu).

**Trạng thái:**
- **Đã có:** có trong mã nguồn và có kiểm thử tự động.
- **Cần sửa:** có, nhưng còn thiếu hoặc lỗi.
- **Chưa có:** chưa làm.
- **Không cần:** không làm, có lý do.

**Đã có không có nghĩa là đã đạt khi dùng thật.** Đến 31/10:
- chưa chạy migration 0016–0021 trên cơ sở dữ liệu thật;
- chưa chạy các bộ thử có gọi AI;
- chưa thử trên điện thoại với học sinh.

Các cột "Kiểm thử" ghi rõ phần nào đã kiểm.

**Kiểm thử chung ngày 31/10:**
- `npm run typecheck` sạch, `npm test` **386/386** đạt, `npx eslint` sạch, `npm run build` thành công.
- Bản build chạy ở máy:
  - các trang học sinh và 11 trang thầy cô mở được, không lỗi, không còn chữ "Mây" trong giao diện;
  - bảng chọn nhân vật hiện đúng;
  - trang Luyện kỹ năng báo "chưa sẵn sàng" đúng như thiết kế khi chưa chạy migration 0017.

## P0

| Yêu cầu | Trạng thái | Mã nguồn | Kiểm thử | Còn phải làm |
|---|---|---|---|---|
| Khóa phiên bản: nhãn commit, mô hình AI, nhật ký đợt thử | Đã có | `lib/version.ts`, `lib/version-shared.ts`, `app/staff/(portal)/VersionLine.tsx`, `next.config.ts`; `ho-so-du-thi/3-kiem-thu/nhat-ky-dot-thu.md` | `lib/version.test.ts`; dòng "Phiên bản: Demo 2.1" hiện trên trang Hôm nay và Tình trạng trợ lý | Đánh thẻ `demo-2.1` khi khóa; điền nhật ký đợt thử; trên Vercel kiểm tra mã commit hiện đúng (bản build ở máy ghi "mã chưa rõ") |
| An toàn hai trục: mức ảnh hưởng tách khỏi mức nguy cơ | Đã có | Đã rà `lib/safety/*`, `app/api/chat/route.ts`, `lib/worries.ts`, các đường nộp bài luyện, bài đo, lời nhờ: không quyết định an toàn nào dựa vào mức lo hay cảm xúc | `lib/safety/hai-truc.test.ts`; 4 câu mới trong `lib/eval/safety-cases.ts` (bộ an toàn 69 câu) | Chạy `npm run eval:safety:3`. Hai câu "căng thẳng nặng" có mức đúng là bình thường; nếu AI xếp "đáng lo" thì Duy quyết định có chấp nhận không |
| Bốn mô-đun K1–K4, chu trình H-M-T-G-N, 7 trạng thái, lưu lần 1 – lần 2 | Đã có | `lib/skills.ts` (K3 có ô "ít nhất hai cách"), `lib/practice/*`, `app/(app)/luyen/*`, `app/actions/practice.ts`, `lib/ai/practice-feedback.ts`, migration `0017_luyen_ky_nang.sql` | `lib/practice/state.test.ts` (28 lần chuyển trạng thái, AI không tự đánh dấu xong), `rows.test.ts` (khôi phục phiên, từ chối kể chuyện riêng, AI lỗi, chuyển an toàn), `output-check.test.ts`, `skills-content.test.ts` | Chạy 0017; thử 4 mô-đun trên điện thoại; cô Thúy duyệt câu Hiểu và Mẫu trong `lib/skills.ts` |
| Không làm hộ | Đã có | `lib/safety/reply-guard.ts` (`lamHo`), `TUTOR_RULES` HL01–HL07 trong lời dặn, kiểm tra đầu ra góp ý | `lib/eval/khong-lam-ho.test.ts`; 12 ca nhiều lượt `lib/eval/khong-lam-ho-cases.ts` + `npm run eval:lamho:3` | Chạy bộ 12 ca × 3 và **hai người đọc nguyên văn**. Bộ kiểm tra `lamHo` dựa vào mẫu câu nên có thể bỏ sót hoặc chặn nhầm |
| 6 ca không làm hộ do người ngoài nhóm viết | Chưa có | — | — | Nhờ người ngoài nhóm viết; chỉ chạy một lần ở cuối |
| Bộ đo 24 điểm: đề A/B đổi chéo, 12 ô, mã ẩn danh, hai người chấm, khóa điểm | Đã có | `app/bai-do/*`, `lib/bai-do*.ts`, `app/staff/(portal)/cham-bai/*`, `lib/test-scoring.ts`, `scripts/bai-do/tao-phieu.ts`, `scripts/tinh-bai-tinh-huong.ts`, migration `0018_bai_do.sql`; bộ đo `ho-so-du-thi/3-kiem-thu/bo-do-ky-nang/` | `lib/bai-do.test.ts` (giao đề), `lib/test-scoring.test.ts` (kappa tính tay, cột phiếu chấm); script tính chạy được trên dữ liệu giả | Chạy 0018; tạo 4 phiếu (`npm run bai-do:tao -- --lop 8A1,8A4 --ghi`); bật "chỉ làm bài đo" cho 8A4; giao người chấm; thử đầu – cuối với 10 bài mẫu |
| Lớp so sánh chỉ thấy bài đo | Đã có | `classes.test_only` (0018), `app/(app)/layout.tsx`, chặn ở `app/api/chat/route.ts` | Đọc mã; chưa thử với tài khoản 8A4 | Tạo tài khoản 15 bạn 8A4, bật chế độ, thử đăng nhập |
| Đồng ý tham gia; người nhận cảnh báo thật, giờ trực; thử email đầu – cuối | Chưa có (việc của người) | Câu khẩn cấp chỉ nói "đã báo" khi cảnh báo được ghi thật (có từ Demo 2) | — | Cô Thúy: xin phép Ban giám hiệu, thông báo phụ huynh; cài email thật; gửi thử một cảnh báo, ghi lúc gửi / nhận / xác nhận |
| Ghi hoạt động học sinh trong đợt thử (không ghi nội dung) | Đã có | `lib/activity-log*.ts`, migration `0016_nhat_ky_hoc_sinh.sql`; chỉ ghi 03–12/11; trang `app/staff/(portal)/nhat-ky/` | `lib/activity-log-shared.test.ts` | Chạy 0016; xóa ngày 15/12 bằng `npm run log:purge` |

## P1

| Yêu cầu | Trạng thái | Mã nguồn | Kiểm thử | Còn phải làm |
|---|---|---|---|---|
| So sánh AI và không AI trên 8 kịch bản cố định | Đã có (công cụ) | `lib/eval/doi-chieu-cases.ts`, `scripts/doi-chieu-kich-ban.ts` (`npm run doi-chieu -- --mo-hinh <tên>`), xuất bản chấm đã che tên và khóa | `lib/eval/doi-chieu.test.ts` | Chạy; điền tay cột chatbot dùng chung; hai người ngoài nhóm chấm |
| Phân tích thống kê tái lập được | Đã có | `scripts/tinh-bai-tinh-huong.ts` (tối thiểu 12 bạn mỗi lớp), `lib/test-scoring.ts` | Có test, có chạy thử trên dữ liệu giả | — |
| Tinh giản chỉ số phụ: không dùng WHO-5, PSS-4 trong đợt thử | Cần sửa (việc của người) | TĐ1–TĐ4, HV1–HV2 nằm trong bài đo ở app. Phiếu Google Form cũ (`lib/effect/survey.ts`) vẫn có WHO-5, PSS-4 | — | Không gửi phiếu Google Form cũ trong đợt thử; nếu cần GHSQ thì chỉ gửi phần GHSQ |
| Chứng cứ: yêu cầu → prompt → commit → ảnh → ca thử | Cần sửa | Nhật ký Vibe Coding v5 ngày 31/10 đã ghi phiên này; commit trên nhánh `demo-2.1` | — | Chụp ảnh các trang mới sau khi chạy migration; thêm mốc vào nhật ký |

## P2

| Yêu cầu | Trạng thái | Mã nguồn | Kiểm thử | Còn phải làm |
|---|---|---|---|---|
| Nhân vật Sóc, Cú, Kiến chỉ đổi giọng; bỏ Mây | Đã có | `lib/ai/chat-style.ts`, `lib/assistant.ts`, `components/mascot/*`, `app/(app)/chat/[id]/ChatStyleSheet.tsx`, trang `app/staff/(portal)/may/tro-chuyen/`, migration `0020_nhan_vat.sql`, `scripts/doi-ten-tro-ly.ts` | `lib/ai/chat-style.test.ts`, `rename-assistant.test.ts`; bảng chọn thấy được trên bản build | Chạy 0020; xem trước rồi chạy `scripts/doi-ten-tro-ly.ts --ghi`; chạy `npm run eval:replies -- --ba-nhan-vat` |
| Theo dõi duy trì sau 4–6 tuần | Không cần trong đợt này | — | — | Kế hoạch, không vào kết quả |

## Các chức năng khác của Demo 2.1

| Chức năng | Trạng thái | Mã nguồn | Kiểm thử |
|---|---|---|---|
| Lời dặn chia 9 phần; thẻ mục tiêu, kỹ năng, dừng | Đã có | `lib/ai/prompts.ts`, `lib/ai/prompt-config.ts`, `lib/ai/reply-cards.ts`, `ReplyCardsView.tsx`, trang Lời dặn chia ô | `lib/ai/reply-cards.test.ts`; bộ 6 ca thẻ `npm run eval:replies -- --the` (chưa chạy) |
| Bảng điều khiển 7 khu | Đã có | `lib/dashboard*.ts`, `app/staff/(portal)/tong-quan/`, migration `0019_nhat_ky_tong_quan.sql` | `lib/dashboard.test.ts`; trang mở được trên bản build |
| Nhật ký hoạt động thầy cô (chỉ thêm, không xóa) | Đã có | `lib/audit*.ts`, `admin_audit` mở rộng ở 0019 | `lib/audit-shared.test.ts` |
| Phân quyền theo trang, có ô khóa | Đã có | `lib/permissions*.ts`, `app/staff/(portal)/phan-quyen/`, 37 trang và các thao tác kiểm tra theo trang | `lib/permissions.test.ts` (kể cả quét mã: mọi trang thầy cô đều kiểm tra quyền) |
| Nhìn lại sau 1–3 ngày, gợi ý tình huống mới, hành trình theo kỹ năng, nhắc nghỉ sau 20 phút | Đã có | `app/actions/review.ts`, `PracticeFollowupCard.tsx`, `SkillJourney.tsx`, `lib/chat-rest*.ts`, migration `0021_nhin_lai_ho_tro.sql` | `lib/practice/review.test.ts`, `lib/chat-rest.test.ts` |
| Soạn để tự hỏi; "Nhờ thầy cô" trong bài tập không tạo cảnh báo; "Hỏi trợ lý" từ bài tập | Đã có | `TalkRequest.tsx`, `lib/help-requests-shared.ts`, `lib/ai/lesson-help.ts` | `lib/help-requests-self.test.ts`, `lib/ai/lesson-help.test.ts` |
| Thư viện 95 bài | Không cần thay đổi | Giữ riêng, không thuộc thực nghiệm | Quyền sử dụng nội dung chưa có văn bản [CXM] |

## Lỗi và rủi ro còn tồn tại

1. Mọi luồng có đọc, ghi cơ sở dữ liệu mới **chưa chạy thật**, vì migration 0016–0021 chưa chạy.
2. Chưa chạy bộ thử nào có gọi AI: an toàn 69 × 3, câu trả lời 20 × 3, ba nhân vật, làm hộ 12 × 3, thẻ gợi ý, đối chiếu. **Chưa được nói "đạt".**
3. **Phần 6 của lời dặn:**
   - Phần "Gợi ý và kết thúc" do trợ lý lập trình viết lại từ kế hoạch, vì không có bản gốc câu ví dụ ĐÚNG/SAI của Duy.
   - Duy cần đọc phần này trên trang Lời dặn, cùng phần 2, phần 3 và câu giới thiệu của ba nhân vật.
4. **Thẻ gợi ý:** chỉ hiện ở câu trả lời mới nhất; mở lại trang thì thẻ của tin cũ không hiện.
5. **"Hỏi trợ lý" từ bài tập:** ngữ cảnh bài tập chỉ có khi mở từ nút đó; mở lại cuộc trò chuyện sau thì mất.
6. **Người chấm bấm "Báo tư vấn viên":** nếu người chấm cũng là cô tư vấn thì cô sẽ biết bài đó là của ai.
7. **Quyền của tư vấn viên:** bị khóa khỏi trang Phiếu khảo sát, vì trang đó ở chế độ admin hiện cả phản hồi từng bạn.
8. **Bài K3 cũ:** bài làm trước khi có ô "hai cách" mà chưa xong thì phải viết thêm ô này ở lần 2.

## Hướng dẫn triển khai Demo 2.1 (trước 03/11)

1. Duy duyệt mã trên nhánh `demo-2.1`, rồi gộp vào `main` để Vercel tự triển khai.
2. Chạy migration theo thứ tự **0016 → 0017 → 0018 → 0019 → 0020 → 0021**:
   - cách 1: `npm run db:migrate`;
   - cách 2: dán từng file vào Supabase SQL Editor.

   Các file đều chạy lại nhiều lần được.
3. Chạy `npx tsx scripts/doi-ten-tro-ly.ts` (xem trước). Nếu ổn thì chạy lại với `--ghi --nguoi "<tên>"`.
4. Cô Thúy duyệt và bật 8 việc nhỏ; Duy đọc lời dặn và câu giới thiệu nhân vật trên trang thầy cô.
5. Tạo tài khoản 15 bạn 8A4, bật "chỉ làm bài đo" cho 8A4; tạo 4 phiếu bài đo; giao người chấm 1, người chấm 2.
6. Chạy các bộ thử P0 (lệnh trong `nhat-ky-dot-thu.md`), đọc nguyên văn, ghi kết quả vào nhật ký đợt thử.
7. **Không đạt P0 thì hoãn dùng thử.** Đạt thì đánh thẻ `demo-2.1` tại commit đã triển khai, ghi commit, mô hình AI và ngày triển khai.

## Commit

Nhánh `demo-2.1`, tạo từ `main` (5dfc05d). Commit mã nguồn Demo 2.1: commit đầu nhánh `demo-2.1` ngày 31/10/2026 (xem `git log demo-2.1`; chưa đẩy lên GitHub, chưa triển khai). Mã commit cuối cùng được khóa cho đợt thử ghi trong `ho-so-du-thi/3-kiem-thu/nhat-ky-dot-thu.md`.
