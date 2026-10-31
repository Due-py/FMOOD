// BỘ THỬ ĐOÁN CHỦ ĐỀ: câu tự đặt theo cách học sinh cấp 2 hay nhắn (có dấu, không dấu, viết tắt).
// Mỗi câu ghi sẵn chủ đề đúng; null = câu không rõ chủ đề, trợ lý phải KHÔNG đoán.
// Không có câu nguy hiểm, không lấy từ tin nhắn của học sinh thật.
// Câu được viết trước khi chạy và không sửa theo kết quả (để con số trung thực).

export type TopicCase = { text: string; expected: string | null };

export const TOPIC_CASES: TopicCase[] = [
  // học tập
  { text: "mai có bài kiểm tra toán mà mình chưa ôn gì cả", expected: "hoc-tap" },
  { text: "hôm nay bị điểm kém môn văn, buồn ghê", expected: "hoc-tap" },
  { text: "sap thi hoc ki roi ma minh hoc khong vao", expected: "hoc-tap" },
  { text: "cô cứ gọi lên bảng là mình run", expected: "hoc-tap" },
  { text: "môn toán khó quá, mình theo không kịp các bạn", expected: "hoc-tap" },
  // bạn bè
  { text: "mình với bạn thân giận nhau từ hôm qua", expected: "ban-be" },
  { text: "trong lớp không ai chơi với mình hết", expected: "ban-be" },
  { text: "tụi nó hay nói xấu mình sau lưng", expected: "ban-be" },
  { text: "minh cai nhau voi ban roi khong biet lam lanh sao", expected: "ban-be" },
  { text: "nhóm bạn đi chơi mà không rủ mình", expected: "ban-be" },
  // gia đình
  { text: "bố mẹ cứ so sánh mình với con nhà người ta", expected: "gia-dinh" },
  { text: "về nhà là bị mắng vì điểm số", expected: "gia-dinh" },
  { text: "dạo này bố mẹ mình hay cãi nhau", expected: "gia-dinh" },
  { text: "em trai lúc nào cũng được bênh còn mình thì không", expected: "gia-dinh" },
  { text: "me minh khong cho minh di choi cuoi tuan", expected: "gia-dinh" },
  // bản thân
  { text: "mình thấy tự ti về ngoại hình của mình", expected: "ban-than" },
  { text: "mấy hôm nay mình mất ngủ", expected: "ban-than" },
  { text: "mình thấy mình không giỏi gì cả", expected: "ban-than" },
  { text: "khong biet minh muon gi nua", expected: "ban-than" },
  { text: "mình hay thấy cô đơn dù ở giữa mọi người", expected: "ban-than" },
  // mạng xã hội
  { text: "có người bình luận chê ảnh mình trên tiktok", expected: "mang-xa-hoi" },
  { text: "mình bị block khỏi nhóm chat của lớp", expected: "mang-xa-hoi" },
  { text: "tối nào cũng lướt mạng tới khuya, không dừng được", expected: "mang-xa-hoi" },
  { text: "bạn chế ảnh mình rồi đăng lên facebook", expected: "mang-xa-hoi" },
  { text: "mình chơi game nhiều quá bị nhắc hoài", expected: "mang-xa-hoi" },
  // không rõ chủ đề: trợ lý không được đoán
  { text: "hôm nay mình thấy hơi lạ lạ", expected: null },
  { text: "chào Sóc, mình mới vào app", expected: null },
  { text: "nhiều chuyện quá không biết kể từ đâu", expected: null },
  { text: "hôm nay trời mưa, mình ở trong phòng", expected: null },
  { text: "ok cảm ơn nha", expected: null },
];
