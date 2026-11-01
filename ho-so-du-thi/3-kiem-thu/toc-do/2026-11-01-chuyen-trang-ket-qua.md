# Tốc độ chuyển trang F-Mood · 01/11/2026

Câu hỏi của Duy: vì sao bản F-Mood khác (dong-hanh-c25w.vercel.app, app Expo) chuyển trang nhanh hơn f-mood-mocha?
Trả lời ngắn: bản Expo tải toàn bộ app (5,5 MB JS) một lần, chuyển trang ngay trên máy. F-Mood (Next.js) mỗi lần bấm menu phải chờ máy chủ dựng trang, trong lúc chờ màn hình đứng yên.

## Đã sửa gì

| # | Việc | File |
|---|---|---|
| 1 | Khung "đang tải" cho khu học sinh: bấm là màn hình đổi ngay, menu sáng mục mới; Next.js tải sẵn khung này cùng link menu | `app/(app)/loading.tsx` |
| 2 | Kiểm phiên đăng nhập bằng `getClaims()` (khóa ES256, kiểm ngay trên máy chủ) thay `getUser()` (hỏi Supabase Auth mỗi trang) | `lib/auth.ts` |
| 2b | Đặt mật khẩu mới xong thì làm mới phiên, vì cờ "phải đổi mật khẩu" giờ đọc từ phiên | `app/actions/account.ts` |
| 3 | Quay lại trang vừa mở trong 30 giây thì hiện ngay bản đã có (`staleTimes.dynamic: 30`) | `next.config.ts` |
| 4 | Menu "Học cùng AI" trỏ thẳng `/chat/new` (trước trỏ `/chat` rồi máy chủ chuyển tiếp, thêm một lượt) | `components/TabBar.tsx` |
| 5 | Bỏ hiệu ứng mờ dần khi chuyển trang (`ViewTransition`, 0,35 giây): đo thấy nó giữ nội dung thật lại sau khung đang tải | `app/(app)/layout.tsx`, `app/globals.css` |

Không cần sửa: vùng máy chủ. Hàm Vercel đã chạy ở Tokyo (`hnd1`, đọc từ `x-vercel-id`), cùng vùng với Supabase (Tokyo, `ap-northeast-1`).

## Cách đo

Công cụ `cong-cu/chuyen-trang.py` (Playwright, Chromium), tài khoản TEST Mây. Mỗi lần bấm một mục menu ghi:
- **phản hồi**: lúc màn hình bắt đầu đổi (hiện khung đang tải hoặc đã sang trang mới);
- **xong**: lúc trang mới hiện đủ nội dung.

Mỗi vòng bấm Kỹ năng → Hành trình → Học cùng AI → Hôm nay. Vòng 1 = lần đầu mở; vòng 2–3 = quay lại trong 30 giây; nghỉ 35 giây rồi vòng 4 = quay lại sau 30 giây. Cỡ máy tính 1280×800 và điện thoại 390×844.
Bản cũ và bản mới chạy cùng lúc trên máy này (`next build` + `next start`, cùng cơ sở dữ liệu thật), đo xen kẽ. Bản mới dựng trong thư mục riêng `FMOOD-moi` = commit `1d18d79` + đúng các file trên, không lẫn thay đổi của phiên khác.

## 1. Trên web thật trước khi sửa (f-mood-mocha, bản `919f5f9`, 18:04)

| | Phản hồi · xong (trung vị, giây) |
|---|---|
| Máy tính | 0,65 · 0,67 |
| Điện thoại | 0,60 · 0,62 |

Phản hồi gần như bằng xong: suốt thời gian chờ, màn hình đứng yên ở trang cũ (ảnh `2026-11-01-chuyen-trang-web-truoc/anh/`, chụp 0,2 giây sau khi bấm: vẫn là trang cũ, menu vẫn sáng mục cũ).
Lưu ý: ở lần đo này, số của "Học cùng AI" thấp hơn thực tế, vì địa chỉ đổi sang `/chat` trước khi trang trò chuyện thật hiện ra. Từ lần đo 2 trên máy, công cụ đã sửa: chỉ tính xong khi tới `/chat/new`.

## 2. Trên máy, lần 1: phát hiện hiệu ứng chuyển trang làm chậm (18:12)

Có khung đang tải và vẫn giữ hiệu ứng mờ dần: phản hồi còn 0,03–0,05 giây, nhưng lần đầu mở trang, nội dung thật lại hiện **muộn hơn** bản cũ (Kỹ năng 0,65 → 0,87 giây).
Đo riêng thời gian máy chủ dựng trang (6 lần, xen kẽ): bản mới **nhanh hơn** ở cả 4 trang (Kỹ năng 0,54 → 0,42; Hành trình 0,81 → 0,70; Học cùng AI 0,74 → 0,62; Hôm nay 0,87 → 0,70 giây). Vậy phần chậm nằm ở trình duyệt.
Thử tắt hiệu ứng ngay trong trình duyệt (`cong-cu/thu-hieu-ung.py`, 5 lần, lần đầu bấm Kỹ năng): có hiệu ứng 0,87 giây, không có 0,47 giây, bản cũ 0,76 giây. Vì vậy bỏ hiệu ứng (việc 5).
Số liệu: `2026-11-01-chuyen-trang-may-lan1-con-hieu-ung/`.

## 3. Trên máy, lần 2: bản cuối (18:34)

| Máy tính · trung vị (giây) | Bản cũ `1d18d79`: phản hồi · xong | Bản mới: phản hồi · xong |
|---|---|---|
| Kỹ năng · lần đầu | 0,61 · 0,61 | 0,01 · 0,54 |
| Kỹ năng · quay lại < 30 giây | 0,66 · 0,68 | 0,01 · 0,03 |
| Kỹ năng · quay lại > 30 giây | 0,81 · 0,84 | 0,01 · 0,78 |
| Hành trình · lần đầu | 1,05 · 1,08 | 0,01 · 1,28 |
| Hành trình · quay lại < 30 giây | 1,03 · 1,06 | 0,01 · 0,03 |
| Hành trình · quay lại > 30 giây | 1,14 · 1,16 | 0,01 · 0,95 |
| Học cùng AI · lần đầu | 1,01 · 1,01 | 0,01 · 0,82 |
| Học cùng AI · quay lại < 30 giây | 0,96 · 0,97 | 0,01 · 0,03 |
| Học cùng AI · quay lại > 30 giây | 1,05 · 1,06 | 0,01 · 0,85 |
| Hôm nay · lần đầu | 1,15 · 1,15 | 0,01 · 0,03 |
| Hôm nay · quay lại < 30 giây | 1,27 · 1,30 | 0,01 · 0,03 |
| Hôm nay · quay lại > 30 giây | 1,13 · 1,16 | 0,01 · 0,93 |
| **Tất cả** | **1,02 · 1,04** | **0,01 · 0,03** |

Điện thoại cho kết quả cùng chiều (tất cả: 1,00 · 1,01 → 0,01 · 0,03 giây; bảng đủ trong `2026-11-01-chuyen-trang-may-lan2/tom-tat.md`).

Gộp cả hai cỡ màn hình (thời gian hiện xong):

| | Bản cũ: trung bình · trung vị | Bản mới: trung bình · trung vị | Số lần bấm mỗi bản |
|---|---|---|---|
| Lần đầu mở trang | 0,99 · 1,08 giây | 0,63 · 0,68 giây | 8 |
| Quay lại < 30 giây | 0,99 · 1,01 giây | 0,03 · 0,03 giây | 32 |
| Quay lại > 30 giây | 1,03 · 1,03 giây | 0,91 · 0,91 giây | 16 |

Đọc kết quả:
- Bấm menu là màn hình đổi ngay (0,01 giây thay vì khoảng 1 giây).
- Quay lại trang vừa xem trong 30 giây: hiện ngay (0,03 giây).
- Lần đầu mở trang, hoặc quay lại sau 30 giây: vẫn phải chờ máy chủ, nhưng nhanh hơn khoảng 0,1–0,4 giây. "Hôm nay · lần đầu" chỉ 0,03 giây vì trang này vừa mở lúc bắt đầu đo (còn trong 30 giây).
- Chưa tốt: Hành trình cỡ máy tính lần đầu 1,08 → 1,28 giây. Số này chỉ có 1 lần đo mỗi bản (lần lặp 1 dùng để chụp ảnh); ở cỡ điện thoại, Hành trình lần đầu nhanh hơn (1,26 → 1,06 giây).
- Số trên máy cao hơn trên web thật, vì máy đo ở xa Supabase (Tokyo) hơn hàm Vercel. Chỉ dùng để so hai bản với nhau.

Ảnh "0,2 giây sau khi bấm" của cả hai bản: `2026-11-01-chuyen-trang-may-lan2/anh/` (`cu-1d18d79_…` = trang cũ còn nguyên; `moi_…` = khung đang tải, menu đã sáng mục mới).

## 4. Kiểm tra không làm hỏng chức năng

- Luồng mật khẩu tạm trên bản mới (học sinh TEST tạm, lớp TESTMK, đã xóa sau khi thử): mở `/home` bị đưa sang `/doi-mat-khau`; đặt mật khẩu mới thì vào `/home`; mở `/ky-nang` được.
- Khu thầy cô (admin TEST): `/staff`, `/staff/classes`, `/staff/safety/risk` trả 200; admin mở `/home` được chuyển sang `/staff`; chưa đăng nhập mở `/staff` về `/staff/login`.
- `tsc --noEmit` và `next build` qua.

## 5. Điều cần biết / việc còn lại

- **Lưu đệm 30 giây:** các thao tác lưu qua server action có `revalidatePath` xóa bộ nhớ này. Riêng tin nhắn chat (`/api/chat`) không xóa. Sau khi trò chuyện, nếu quay về một trang vừa xem chưa quá 30 giây, trang đó có thể chưa có thay đổi từ cuộc trò chuyện.
- **getClaims:** cờ "phải đổi mật khẩu" đi theo phiên. Học sinh đang đăng nhập sẵn mà được thầy cô đặt mật khẩu tạm thì tới lần phiên tự làm mới (tối đa khoảng 1 giờ) mới bị yêu cầu đổi mật khẩu. Người đăng nhập bằng mật khẩu tạm vẫn bị chặn ngay. Khóa tài khoản vẫn có hiệu lực ngay (đọc từ bảng profiles).
- **Bỏ hiệu ứng mờ dần** là thay đổi nhìn thấy được. Nếu Duy muốn giữ hiệu ứng, phải chấp nhận nội dung hiện chậm hơn khoảng 0,3–0,4 giây.

## 6. Trên web thật sau khi sửa (bản `8c0e11c`, đẩy lên lúc 18:51, đo lúc 18:54)

Cùng công cụ, cùng tài khoản, 3 lần lặp × 2 cỡ màn hình. Trung vị (giây), phản hồi · xong:

| Trang · lần | Trước (`919f5f9`) | Sau (`8c0e11c`) | Số lần bấm trước / sau |
|---|---|---|---|
| Kỹ năng · lần đầu | 0,53 · 0,54 | 0,01 · 0,43 | 4 / 4 |
| Kỹ năng · quay lại < 30 giây | 0,43 · 0,45 | 0,01 · 0,03 | 12 / 12 |
| Kỹ năng · quay lại > 30 giây | 0,77 · 0,79 | 0,01 · 0,44 | 6 / 6 |
| Hành trình · lần đầu | 0,93 · 0,96 | 0,01 · 0,81 | 4 / 4 |
| Hành trình · quay lại < 30 giây | 0,65 · 0,68 | 0,01 · 0,03 | 12 / 12 |
| Hành trình · quay lại > 30 giây | 0,70 · 0,72 | 0,01 · 0,67 | 6 / 6 |
| Hôm nay · lần đầu | 0,75 · 0,76 | 0,01 · 0,03 | 4 / 4 |
| Hôm nay · quay lại < 30 giây | 0,65 · 0,67 | 0,01 · 0,03 | 12 / 12 |
| Hôm nay · quay lại > 30 giây | 0,69 · 0,71 | 0,01 · 0,74 | 6 / 6 |
| **3 trang trên · lần đầu** | **0,75 · 0,76** | **0,01 · 0,43** | 12 / 12 |
| **3 trang trên · quay lại < 30 giây** | **0,64 · 0,66** | **0,01 · 0,03** | 36 / 36 |
| **3 trang trên · quay lại > 30 giây** | **0,70 · 0,72** | **0,01 · 0,67** | 18 / 18 |

- Bấm menu là màn hình đổi ngay: 0,64–0,75 giây → 0,01 giây.
- Quay lại trong 30 giây: 0,66 → 0,03 giây.
- Lần đầu mở trang: 0,76 → 0,43 giây (trung vị cả 3 trang; Hành trình 0,96 → 0,81).
- Quay lại sau 30 giây: gần như cũ (0,72 → 0,67); Hôm nay 0,71 → 0,74, coi như không đổi.
- Học cùng AI: bản trước đo theo cách cũ (tính xong khi địa chỉ đổi sang `/chat`, trước khi trang trò chuyện hiện ra) nên số 0,29–0,32 giây thấp hơn thực tế, không so được. Bản sau đo đúng `/chat/new`: lần đầu 0,73 giây, quay lại trong 30 giây 0,03 giây. So đúng cách trên máy (mục 3): 1,01–1,07 → 0,82–0,87 giây.
- Trong lúc đo, phiên khác đẩy bản `4b2074f` (18:56): 1 lần bấm thành tải lại cả trang (chỉ có mốc xong), các lần bấm sau đo trên bản `4b2074f` (có thay đổi này cộng thay đổi trang bài luyện của phiên kia).

Số liệu: `2026-11-01-chuyen-trang-web-sau/`.
