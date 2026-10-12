# F-Mood · Save and Sound

> Cảm xúc được lắng nghe, bản thân được thấu hiểu.

Web hỗ trợ cảm xúc cho học sinh THCS/THPT, dự án của đội **The Crusaders** (lớp 8A1, Trường TH, THCS và THPT FPT Bắc Giang) tham gia STEMpetition 2026–2027, Challenge 2 – Healthy Living.

Gồm **trang học sinh** (`/`) và **trang thầy cô** (`/staff`).

## Tính năng (phía học sinh)

| Màn hình | Có gì |
|---|---|
| Trang đầu `/` | Đăng nhập / tạo tài khoản bằng **mã lớp + biệt danh + mật khẩu** (không cần email) |
| Làm quen `/onboarding` | Gặp linh vật **Mây**, quy tắc riêng tư, "F-Mood không phải chuyên gia tâm lý" |
| Trang chủ `/home` | Mây chào và nhắc check-in, cảm xúc 7 ngày, thói quen hôm nay, bài học gợi ý |
| Check-in `/checkin` | Chọn 1–5 cảm xúc bằng emoji, check-in nhiều lần mỗi ngày |
| Trò chuyện `/chat` | Trò chuyện với Mây (OpenAI), lưu lại, xóa được |
| Thói quen `/habits` | Thói quen hằng ngày, chuỗi ngày 🔥, động viên bắt đầu lại khi đứt chuỗi |
| Thư viện `/library` | Bài học well-being theo lớp và chủ đề |
| Tôi `/me` | Lịch cảm xúc, biểu đồ 7 ngày, giao diện sáng/tối, đổi mật khẩu, xóa dữ liệu |

### An toàn

- **Kiểm tra mỗi tin nhắn:** bộ lọc từ khóa + AI phân loại có xét bối cảnh. OpenAI Moderation chỉ dùng dự phòng khi AI phân loại lỗi, vì khi thử với tiếng Việt nó báo nhầm câu nói quá ("mệt muốn chết") và bỏ sót câu gián tiếp.
- **Mức nguy hiểm:** AI *không* tự trả lời. Học sinh thấy câu trả lời soạn sẵn, thẻ số điện thoại hỗ trợ (111, 115, phòng tham vấn) và thông báo "thầy cô phụ trách đã được báo".
- **Mức đáng lo** (bị bắt nạt, bị đe dọa…): AI trả lời và khuyến khích tìm người lớn, kèm thẻ hỗ trợ và thông báo.
- **Cảm xúc nặng lòng N ngày liền** (mặc định 5, chỉnh theo lớp): tạo cảnh báo mức "theo dõi".
- Cảnh báo lưu ở bảng `alerts`, **chỉ chứa đoạn bị gắn cờ**. Thầy cô không đọc được các cuộc trò chuyện khác.

### Nội dung để giáo viên duyệt

| File | Nội dung |
|---|---|
| `content/safety/crisis-response.md` | Câu trả lời soạn sẵn khi có dấu hiệu nguy hiểm |
| `lib/ai/prompts.ts` | Lời dặn cho Mây (system prompt) và tiêu chí phân loại rủi ro |
| `lib/safety/keywords.ts` | Danh sách cụm từ nguy hiểm (có test: `npm test`) |
| `lib/mascot.ts` | Lời thoại của Mây |
| `content/lessons/*.md` | Bài học trong thư viện |

## Cài đặt

Cần **Node.js 20+**.

### 1. Cài thư viện

```bash
npm install
```

### 2. Tạo dự án Supabase

1. Vào [supabase.com](https://supabase.com) → **New project**. Region nên chọn **Southeast Asia (Singapore)**.
2. Lấy các thông tin sau:
   - **Project Settings → API Keys**: *Project URL*, *Publishable key*, *Secret key*
   - **Connect → Connection string → URI** (để chạy migration)

### 3. Điền biến môi trường

Sao chép `.env.example` thành `.env.local` rồi điền các giá trị. **Không bao giờ** gửi `.env.local` lên GitHub hay chia sẻ Secret key.

### 4. Tạo bảng dữ liệu

```bash
npm run db:migrate
```

(Hoặc mở **SQL Editor** trong Supabase, dán lần lượt nội dung các file trong `supabase/migrations/` theo thứ tự tên file và bấm Run.)

### 5. Tạo lớp và lấy mã lớp

```bash
npm run class:create -- "8A1" 8
```

Script in ra mã lớp (ví dụ `K7QX2M`) để đưa cho học sinh tạo tài khoản.

### 6. Chạy thử

```bash
npm run dev
```

Mở http://localhost:3000.

### Cài đặt nên chỉnh trong Supabase

- **Authentication → Rate Limits**: cả lớp đăng nhập cùng lúc qua wifi trường sẽ dùng chung một địa chỉ IP. Nên tăng giới hạn *sign-ins/sign-ups* (ví dụ 150 lượt / 5 phút).

## Trang thầy cô (`/staff`)

| Vai trò | Được làm gì |
|---|---|
| **Giáo viên chủ nhiệm** | Cảnh báo, danh sách học sinh (họ tên + biệt danh) và thống kê cảm xúc ẩn danh của **lớp mình chủ nhiệm**. Đặt lại mật khẩu học sinh lớp mình. |
| **Phòng tham vấn** | Như trên nhưng cho **tất cả các lớp**. |
| **Admin** | Mọi quyền trên, cộng: tạo/sửa/xóa lớp, gán GVCN, tạo mã lớp mới, khóa/xóa học sinh, tạo/khóa/xóa tài khoản thầy cô, đặt lại mật khẩu thầy cô. |

- Thầy cô **không** xem được check-in, trò chuyện hay thói quen của từng học sinh. Chỉ thấy đoạn tin nhắn bị gắn cờ trong cảnh báo.
- Thống kê lớp chỉ hiện khi có ít nhất **3 học sinh** check-in trong 7 ngày; ngày nào ít hơn 3 em thì để trống.
- Mọi quyền được kiểm tra ở server: `lib/staff.ts` (đọc dữ liệu) và `app/actions/staff.ts` (thao tác).

### Tính năng của admin

| Nhóm | Tính năng |
|---|---|
| **Bàn làm việc** | Tình trạng Mây (model, kho kiến thức, kết nối AI/DB), lối tắt mọi tính năng, hoạt động gần đây |
| **An toàn** | Cảnh báo · Phát hiện rủi ro (thêm cụm từ nguy hiểm, sửa tiêu chí AI, **thử một câu**) · Khẩn cấp (câu trả lời soạn sẵn, số hỗ trợ) |
| **Nội dung** | Thư viện bài học (soạn Markdown có xem trước) · Câu hỏi & gợi ý (câu mở đầu chat, câu hỏi suy ngẫm hằng ngày) · Khu vườn (loại cây, số giọt nước) |
| **Mây** | Lời dặn · Nhân vật · Kịch bản theo chủ đề · Kho kiến thức (tải PDF, **dạy lại**, thử tra cứu) · Tình trạng Mây (lượt dùng, lỗi, đổi model) |
| **Lớp và người** | Thành viên (thầy cô + học sinh, chuyển lớp) · Tình hình lớp |
| **Nghiên cứu** | Kết quả nghiên cứu (số liệu ẩn danh, tải CSV) · Phiếu khảo sát · Bộ thử của Mây |

Các trang Lời dặn, Nhân vật và Kịch bản có ô **Thử nói chuyện** để xem Mây trả lời thế nào trước khi lưu.
Mọi nội dung admin sửa được lưu ở bảng `app_settings`. Giá trị mặc định nằm trong code (`lib/settings.ts`, `lib/ai/prompts.ts`), có nút **Khôi phục mặc định**.

**Kho kiến thức** cần extension `vector` (pgvector) và bucket Storage `kb`. Cả hai đã có sẵn trong `0003_admin.sql`. PDF phải là bản có thể chọn chữ, không phải ảnh scan.

### Tạo tài khoản admin đầu tiên

```bash
npm run admin:create -- <email> "<Tên hiển thị>"
```

Lệnh hỏi mật khẩu (không hiện khi gõ). Sau đó đăng nhập tại `/staff/login` và tạo tài khoản thầy cô trong mục **Thầy cô**. Hệ thống tạo mật khẩu tạm, chỉ hiện một lần.

Thầy cô cũng có thể **tự tạo tài khoản** ở `/staff/login` → **Tạo tài khoản**, bằng mã đăng ký chung đặt trong biến môi trường `STAFF_SIGNUP_CODE` (để trống thì tắt tính năng này). Tài khoản tự tạo luôn là giáo viên và chưa phụ trách lớp nào. Admin vào lớp để gán GVCN, hoặc đổi vai trò sang phòng tham vấn trong mục **Thầy cô**. Muốn đổi mã thì sửa biến môi trường (trên Vercel thì Redeploy).

**Nhớ tài khoản:** khi đăng nhập, nếu tick ô này thì phiên được giữ khoảng 400 ngày và máy điền sẵn mã lớp + biệt danh (hoặc email). Không tick thì đóng trình duyệt là phải đăng nhập lại. Mật khẩu không bao giờ được lưu.

### Quên mật khẩu

- **Học sinh:** GVCN hoặc admin bấm "Đặt lại mật khẩu" trong trang lớp. Hoặc dùng lệnh `npm run student:reset-password -- <MÃLỚP> "<biệt danh>" <mật khẩu mới>`.
- **Thầy cô:** admin đặt lại trong mục **Thầy cô**.
- **Admin:** chạy lại `npm run admin:create -- <email>` để đặt mật khẩu mới.

## Thêm bài học

Tạo file `content/lessons/<ten-bai>.md`:

```markdown
---
title: Tên bài
summary: Một câu tóm tắt
grade: 7            # lớp 6, 7 hoặc 8
unit: Bài 3
topic: Hiểu cảm xúc # các bài cùng chủ đề sẽ nằm chung một nhóm
emoji: 🌱
order: 3            # thứ tự trong lớp
source: Tóm tắt từ Well-being 7 (Oxford), Bài 3
---

Nội dung bài viết bằng Markdown…
```

Nội dung từ sách có bản quyền cần được **tóm tắt / diễn đạt lại và ghi nguồn**.

## Đưa lên mạng (Vercel)

1. Đẩy code lên GitHub.
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → chọn repo.
3. Thêm các biến môi trường giống `.env.local` (trừ `SUPABASE_DB_URL`).
4. Deploy.

## Lệnh hữu ích

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy thử trên máy |
| `npm run build` | Build bản production |
| `npm run lint` / `npm run typecheck` | Kiểm tra code |
| `npm test` | Chạy test bộ lọc từ khóa |
| `npm run lessons:check` | Kiểm tra cấu trúc bài học trong `content/lessons/oxford/*.json` |
| `npm run lessons:import` | Nhập bài học vào thư viện (thêm `-- --ghi-de` để ghi đè bài đã có) |
| `npm run eval:safety` | Chấm thử cả 3 lớp an toàn với OpenAI thật (12 câu mẫu, tốn chút phí API) |

## Công nghệ

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, RLS) · OpenAI (Responses API, Moderation) · motion

---

F-Mood là công cụ hỗ trợ, **không phải chuyên gia tâm lý**. Khi khẩn cấp, gọi **111** (Tổng đài Bảo vệ trẻ em) hoặc **115**.
