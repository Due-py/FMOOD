// "HỎI TRỢ LÝ" TỪ MỘT BÀI TẬP TRONG THƯ VIỆN (kế hoạch Demo 3, mục 5.3; thuộc Demo 2.1).
// Dùng chung cho máy chủ và test (không đọc cơ sở dữ liệu).
// Máy chủ tự đọc tên bài và đề từ bài đã đăng (không tin chữ trình duyệt gửi), rồi thêm đoạn này vào cuối lời dặn.
// Trợ lý chỉ giúp hiểu đề và chuẩn bị câu hỏi; KHÔNG đưa đáp án, không làm hộ (HL03). Không bao giờ đưa đáp án đúng vào lời dặn.

import type { Exercise } from "@/lib/exercises";

export type LessonContext = { title: string; exercise: Pick<Exercise, "type" | "prompt" | "options"> };

const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** Đoạn thêm vào lời dặn khi học sinh mở trò chuyện từ nút "Hỏi …" của một bài tập. */
export function lessonHelpPrompt({ title, exercise }: LessonContext): string {
  const options =
    (exercise.type === "choice" || exercise.type === "multi") && exercise.options.length
      ? `\nCác lựa chọn trong đề: ${exercise.options.map((o) => `“${clip(o, 120)}”`).join("; ")}.`
      : "";
  return `BÀI TẬP BẠN ẤY ĐANG HỎI
Bạn ấy mở trò chuyện từ bài tập trong bài học “${clip(title, 120)}”.
Đề bài: “${clip(exercise.prompt, 400)}”${options}
Cách giúp ở bài tập này (theo HL03, không làm hộ):
- Giúp bạn ấy HIỂU ĐỀ: đề hỏi gì, từ nào khó, cần nghĩ theo hướng nào; có thể nêu một ví dụ ở tình huống KHÁC hoặc một khung có chỗ trống (___).
- Giúp bạn ấy CHUẨN BỊ CÂU HỎI để hỏi thầy cô nếu vẫn chưa rõ: hỏi bạn ấy đang vướng ở đâu, đã thử gì, rồi để bạn ấy tự viết câu hỏi.
- KHÔNG đưa đáp án, không nói lựa chọn nào đúng, không viết sẵn câu trả lời để bạn ấy chép. Bị đòi đáp án thì nói nhẹ nhàng vì sao, rồi hỏi một câu để bạn ấy tự nghĩ tiếp.`;
}
