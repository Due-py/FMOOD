// Phần dùng chung của nhật ký hoạt động học sinh (không đọc cơ sở dữ liệu, chạy được ở test).

/** Các loại việc được ghi. Chỉ thêm loại mới ở đây. */
export const ACTIVITY_KINDS = {
  login: "Đăng nhập",
  checkin: "Ghi tâm trạng",
  chat_start: "Bắt đầu trò chuyện",
  chat_message: "Gửi tin nhắn",
  practice_open: "Mở bài luyện",
  practice_submit: "Nộp bài luyện",
  practice_feedback: "Nhờ góp ý bài luyện",
  practice_revise: "Sửa bài luyện lần 2",
  practice_complete: "Hoàn thành bài luyện",
  practice_followup: "Trả lời hỏi lại sau bài luyện",
  action_done: "Làm xong việc nhỏ",
  test_start: "Bắt đầu bài đo",
  test_submit: "Nộp bài đo",
  survey_submit: "Nộp phiếu khảo sát",
  help_request: "Gửi lời nhờ thầy cô",
  help_self_ask: "Sao chép lời nhờ để tự hỏi (không gửi)",
  help_button: "Bấm Cần giúp",
  chat_rest: "Thấy lời nhắc nghỉ",
  sel_step: "Bước trò chuyện SEL",
  habit_review: "Nhìn lại thói quen cùng trợ lý",
  habit_adjust: "Chọn điều chỉnh thói quen trợ lý gợi ý",
  journal_write: "Viết nhật ký",
  journal_next: "Nhờ gợi ý viết tiếp nhật ký",
  journal_review: "Nhìn lại tuần trong nhật ký",
} as const;

export type ActivityKind = keyof typeof ACTIVITY_KINDS;

/** Ngày xóa toàn bộ nhật ký học sinh (30 ngày sau ngày nộp báo cáo). */
export const LOG_DELETE_ON = "2026-12-15";
