# Nhật ký đợt thử Demo 2.1 (03/11 – 12/11/2026)

Mẫu ghi theo P0 "Khóa phiên bản dùng thử" (kế hoạch `ho-so-du-thi/2-xay-dung/ke-hoach-2026-10-31-demo-3-luyen-ky-nang.md`, mục "CẬP NHẬT CUỐI 31/10").
15 học sinh lớp 8A1 dùng **đúng một bản đã khóa** trong suốt đợt. Trong đợt **chỉ sửa lỗi an toàn khẩn cấp**; mọi thay đổi, kể cả đổi cài đặt trên trang thầy cô, đều ghi ở mục 5.

Ô nào chưa có thì để `…`, không đoán. Chức năng chưa đạt kiểm thử thì ghi **"Chưa đạt"**, không ghi "xong".

## 1. Bản đã khóa

| Mục | Giá trị | Nguồn đối chiếu |
|---|---|---|
| Tên bản | Demo 2.1 | Dòng "Phiên bản" cuối trang thầy cô **Hôm nay** và trang **Tình trạng trợ lý** |
| Mã commit (đủ 40 ký tự) | `…` | `git rev-parse HEAD` lúc khóa; trên web là 7 ký tự đầu |
| Nhánh | `main` | Dòng "Phiên bản" (nhánh …) |
| Thẻ git đánh dấu bản khóa | `demo-2.1` (đề xuất) | `git tag demo-2.1 <mã>` rồi `git push origin demo-2.1` |
| Địa chỉ web | `…` | Vercel → Deployments → bản Production |
| Ngày giờ triển khai | `…` | Dòng "Phiên bản" (triển khai …) và Vercel |
| Người khóa | Duy | |
| Migration đã chạy tới | `00…` | `npm run db:migrate` (bản ghi lần chạy cuối) |

## 2. Cấu hình AI đã khóa

Không đổi trong đợt thử. Đổi mô hình là thay đổi phải ghi ở mục 5 và chạy lại bộ thử an toàn trước khi bật.

| Mục | Giá trị | Nơi xem |
|---|---|---|
| Mô hình trò chuyện | `…` | Trang **Tình trạng trợ lý** → Model đang dùng (cài đặt `ai.models`) |
| Mô hình phân loại an toàn | `…` | như trên |
| Moderation dự phòng | `omni-moderation-latest` | `lib/safety/check.ts` |
| Mô hình tra cứu tài liệu | `text-embedding-3-small` | `lib/ai/openai.ts` |
| Lời dặn (6 phần) | lưu bản xuất ngày `…` | Trang **Lời dặn**; chép nguyên văn vào `ket-qua/` |
| Nhân vật mặc định, độ dài, cách dẫn dắt, động lực | `…` | Trang **Nhân vật và lựa chọn** |
| Cụm từ an toàn admin thêm (`safety.phrases`) | `…` câu khẩn cấp, `…` câu đáng lo | Trang **Phát hiện rủi ro** |
| Kỹ năng bật góp ý của trợ lý / dùng tiêu chí cố định | K1 `…` · K2 `…` · K3 `…` · K4 `…` | Điểm kiểm soát tối 02/11 |

**An toàn hai trục (P0, cố định trong mã).** Mức nguy cơ an toàn (bình thường / đáng lo / khẩn cấp) chỉ xét từ **chữ học sinh viết** (tin nhắn, ô bài luyện, ghi chú) qua 3 lớp: từ khóa, AI phân loại, Moderation dự phòng. Mức ảnh hưởng của căng thẳng (nhẹ / vừa / nặng), mức lo học sinh tự chọn (1–5) và cảm xúc check-in **không làm tăng hay giảm** mức nguy cơ. Hai cảnh báo theo dõi bổ sung (không đổi mức nguy cơ của tin nhắn nào): "worry_worse" khi học sinh chọn "Nặng hơn" và "Lo rất nhiều"; "negative_streak" khi nhiều ngày liền check-in cảm xúc nặng lòng. Kiểm thử: `lib/safety/hai-truc.test.ts` và 4 câu "hai trục" trong `lib/eval/safety-cases.ts`.

## 3. Bộ thử trước khi khóa (bắt buộc, 01–02/11)

Chạy trên **đúng mã commit ở mục 1** (tên file kết quả có mã commit; có hậu tố `-sua` là chạy trên bản còn sửa chưa lưu, **không dùng làm bằng chứng khóa**).

| Bộ thử | Lệnh | Ngưỡng | Kết quả | File kết quả (`ho-so-du-thi/3-kiem-thu/ket-qua/`) |
|---|---|---|---|---|
| Kiểm thử đơn vị | `npm test` | đạt hết | `…/…` | (ghi số dòng `pass`) |
| Kiểu dữ liệu, kiểm tra mã | `npm run typecheck` · `npx eslint app lib components scripts` | không lỗi | `…` | |
| An toàn × 3 lần | `npm run eval:safety:3` | 0 bỏ sót, 0 báo nhầm cả 3 lần | `…` | `an-toan-3-lan_…` |
| Câu trả lời × 3 lần (đọc nguyên văn) | `npm run eval:replies:3` | ≥ 18/20 mỗi lần | `…` | `cau-tra-loi-3-lan_…` |
| Ba nhân vật (P2) | `npm run eval:replies -- --ba-nhan-vat` | ≥ 18/20 mỗi nhân vật | `…` | `cau-tra-loi-ba-nhan-vat_…` |
| Không làm hộ 12 ca × 3 | `npm run eval:lamho:3` | 0 lượt làm hộ, người đọc nguyên văn | `…` | `khong-lam-ho-3-lan_…` |
| Phân quyền | `npm run proof:roles` | đạt hết | `…` | `phan-quyen/…` |
| Tách dữ liệu | `npm run proof:isolation` | đạt hết | `…` | `tach-du-lieu/…` |
| Đối chiếu AI / không AI (P1) | `npm run doi-chieu` | lưu nguyên văn, chấm mù sau | `…` | `doi-chieu_…` |
| Thử đầu – cuối 4 kỹ năng và bài đo trên điện thoại | tay | đủ bước, không lỗi | `…` | ảnh chụp: `…` |
| Thử email cảnh báo thật đầu – cuối | tay | ghi gửi / nhận / xác nhận | `…` | |

## 4. Kiểm tra trước 03/11 (đánh dấu khi xong)

- [ ] Mọi thay đổi Demo 2.1 đã commit, Duy duyệt, đẩy lên `main`; không còn sửa chưa lưu trên máy dùng để triển khai
- [ ] Vercel triển khai đúng commit; dòng "Phiên bản" trên trang thầy cô khớp mục 1
- [ ] Đã đánh thẻ git `demo-2.1` cho commit này
- [ ] Migration đã chạy đủ trên cơ sở dữ liệu thật (ghi số ở mục 1)
- [ ] Mô hình AI ở trang Tình trạng trợ lý khớp mục 2; chụp ảnh trang
- [ ] Chép nguyên văn lời dặn, cụm từ an toàn, cài đặt nhân vật vào `ket-qua/`
- [ ] Bộ thử mục 3 đạt ngưỡng, file kết quả mang đúng mã commit
- [ ] Bài đo: đề A/B, rubric, ngưỡng đã chốt (README bộ đo có ngày, người chốt)
- [ ] Email cảnh báo thật: gửi thử, có người nhận, có xác nhận; ghi đầu mối trực và giờ trực
- [ ] Có đồng ý của nhà trường; thông báo, phiếu đồng ý phụ huynh đã gửi
- [ ] Tài khoản 8A1, 8A4 đăng nhập thử được; lớp 8A4 ở chế độ "chỉ làm bài đo"
- [ ] Ghi đang bật "Ghi hoạt động học sinh" trong đúng khoảng ngày đợt thử
- [ ] Điểm kiểm soát tối 02/11: kỹ năng nào còn lỗi làm hộ / an toàn thì chuyển sang tiêu chí cố định (ghi ở mục 2)
- [ ] Nhánh `demo-3` đã tạo (mục 7); không ai triển khai từ nhánh đó lên bản Production

## 5. Thay đổi trong đợt thử

Chỉ sửa **lỗi an toàn khẩn cấp**. Mỗi thay đổi (mã, cài đặt trên trang thầy cô, mô hình, lời dặn, nội dung duyệt) ghi một dòng, kèm commit mới và kết quả bộ thử an toàn chạy lại.

| Ngày giờ | Thay đổi | Lý do (minh chứng gốc) | Chỉ vì an toàn? | Commit / nơi sửa | Bộ thử chạy lại, kết quả | Ảnh hưởng tới dữ liệu và cách diễn giải | Người duyệt |
|---|---|---|---|---|---|---|---|
| … | … | … | Có / Không | … | … | … | Duy |

## 6. Sự cố và lỗi

Ghi cả lỗi chưa sửa (để Demo 3 xử lý). Không chép nội dung học sinh viết; chỉ ghi mã ẩn danh nếu cần.

| Mã | Ngày giờ | Ai phát hiện | Mô tả (không kèm nội dung học sinh) | Mức (an toàn / chặn dùng / khó chịu / nhỏ) | Ảnh hưởng tới dữ liệu | Xử lý trong đợt | Chuyển Demo 3? |
|---|---|---|---|---|---|---|---|
| SC01 | … | … | … | … | … | … | … |

## 7. Demo 3 làm trên nhánh riêng, sau đợt thử

- Ngày khóa, tạo nhánh từ đúng bản đã khóa: `git switch -c demo-3 demo-2.1`. Mọi sửa của Demo 3 commit vào `demo-3`; `main` giữ nguyên Demo 2.1 cho tới khi đợt thử kết thúc (12/11).
- Vercel tự tạo bản **Preview** cho nhánh `demo-3` (dòng "Phiên bản" ghi "nhánh demo-3 · bản preview"); **không** đổi bản Production, **không** đưa đường dẫn Preview cho 8A1 trong đợt thử. Đặt biến `FMOOD_VERSION_NAME=Demo 3` cho môi trường Preview để nhãn hiện đúng tên.
- Demo 3 **không thêm tính năng mới**: chỉ sửa lỗi nhỏ, tối ưu trải nghiệm theo phản hồi, kiểm thử hồi quy. Mỗi thay đổi ghi: vấn đề phát hiện trong thử nghiệm (mã ở mục 6), minh chứng gốc, mức ưu tiên, thay đổi mã, kết quả kiểm thử lại, ảnh hưởng tới diễn giải.
- Lỗi an toàn khẩn cấp trong đợt: sửa trên `main` (ghi mục 5), rồi đưa cùng bản sửa sang `demo-3` (`git cherry-pick <mã>`).
- Sau 12/11 (đã đo lần 2): gộp `demo-3` vào `main` (`git merge demo-3`), chạy lại toàn bộ mục 3, rồi mới triển khai.
