// CÁC PHẦN TRÌNH DIỄN theo thứ tự nên trình bày, kèm gợi ý lời nói cho người trình bày.
// Dùng cho trang /staff/trinh-dien (mục lục), thanh chuyển phần, và kịch bản in ra (ho-so-du-thi).

export type DemoSection = {
  slug: string;
  href: string;
  emoji: string;
  title: string;
  /** câu hỏi của giám khảo mà phần này trả lời */
  question: string;
  minutes: number;
  /** bấm gì, theo thứ tự */
  doThis: string[];
  /** gợi ý lời nói (nói tự nhiên, không cần thuộc lòng) */
  say: string[];
};

export const DEMO_SECTIONS: DemoSection[] = [
  {
    slug: "mo-dau",
    href: "/staff",
    emoji: "🏫",
    title: "Một tháng của 3 lớp",
    question: "App này dùng ở trường trông như thế nào?",
    minutes: 1,
    doThis: ["Bật chế độ trình diễn.", "Mở trang Hôm nay, chỉ vào ô Việc cần làm và nhịp cảm xúc của 3 lớp.", "Mở Tình hình lớp → lớp 7A (mẫu)."],
    say: [
      "Đây là dữ liệu MẪU giống như 3 lớp đã dùng F-Mood khoảng một tháng. Học sinh thật không bị ảnh hưởng và không xuất hiện ở đây.",
      "Mỗi sáng thầy cô mở trang này là biết ngay việc cần làm: bạn nào cần được quan tâm, bạn nào nhờ nói chuyện.",
      "Thầy cô chỉ thấy cảm xúc CHUNG của lớp. Ngày nào ít hơn 5 bạn check-in thì app tự ẩn, để không ai đoán ra được là bạn nào.",
    ],
  },
  {
    slug: "hanh-trinh",
    href: "/staff/trinh-dien/hanh-trinh",
    emoji: "🗓️",
    title: "Hành trình của một bạn",
    question: "Một bạn được giúp đỡ cụ thể ra sao?",
    minutes: 2.5,
    doThis: [
      "Chọn bạn Bánh Bao. Chỉ lịch cảm xúc, rồi 2 chuyện bận lòng có mức lo giảm dần.",
      "Bấm Tua nhanh 7 ngày. Thẻ \"Sóc hỏi thăm\" hiện ra trên điện thoại.",
      "Chọn đám mây \"Lo một chút\" rồi bấm Đỡ hơn: trợ lý đáp lại, và thấy mức lo lúc kể → bây giờ.",
    ],
    say: [
      "Đây là bạn Bánh Bao trong một tháng. Đầu tháng bạn ấy lo bài kiểm tra Toán, mức lo 4 trên 5.",
      "Trợ lý không chỉ nghe rồi thôi: trợ lý gợi ý một việc nhỏ, và 3 ngày sau quay lại hỏi \"giờ bạn thấy thế nào\". Mức lo giảm dần 4 → 3 → 2 → 1.",
      "Hôm nay bạn ấy vừa kể chuyện mới. Để không phải đợi 3 ngày, em bấm Tua nhanh 7 ngày: trợ lý hỏi lại ngay trên trang chủ của bạn ấy.",
      "Tua nhanh chỉ làm được với tài khoản mẫu. Code kiểm tra 3 điều: có trong sổ tài khoản mẫu, ở lớp mẫu, có email mẫu. Thiếu một điều là từ chối.",
    ],
  },
  {
    slug: "may-nghi",
    href: "/staff/trinh-dien/may-nghi",
    emoji: "🧠",
    title: "Trợ lý hiểu tin nhắn thế nào",
    question: "AI xử lý một câu như thế nào, có phải hộp đen không?",
    minutes: 2,
    doThis: ["Bấm câu mẫu \"Mai kiểm tra Toán mà mình chưa ôn kịp…\" (hoặc nhờ giám khảo tự gõ một câu bình thường).", "Đọc lần lượt từng bước khi nó sáng lên."],
    say: [
      "Mỗi tin nhắn đi qua khoảng 12 bước. Bước 1–4 là an toàn: bộ lọc từ khóa chạy ngay trên máy chủ không cần mạng, rồi một AI riêng chỉ làm việc phân loại mức nguy hiểm.",
      "Chỉ khi an toàn, trợ lý mới đoán chủ đề, tìm hướng dẫn thầy cô viết sẵn và tài liệu đã duyệt, rồi ghép thành lời dặn cho AI.",
      "Câu trả lời xong còn được máy chấm lại: có xưng \"mình\", gọi \"bạn\" không, có lỡ nói bạn bị bệnh gì không.",
      "Trong trình diễn không có gì được lưu.",
    ],
  },
  {
    slug: "nguy-hiem",
    href: "/staff/trinh-dien/nguy-hiem",
    emoji: "🚨",
    title: "Khi có chuyện nguy hiểm",
    question: "Nếu một bạn gặp nguy hiểm thật thì sao?",
    minutes: 2,
    doThis: [
      "Bấm \"Nói quá cho vui\" trước: AI chạy thật và KHÔNG báo động nhầm.",
      "Bấm \"Một bạn đang gặp nguy hiểm\": câu trả lời soạn sẵn, tư vấn viên thấy gì, GVCN thấy gì, email.",
      "Bấm Mở hộp Cảnh báo để thấy cảnh báo vừa tới.",
    ],
    say: [
      "Em không dùng câu nguy hiểm thật để trình diễn. Bước nhận ra được giả lập; còn mọi bước sau đó là code thật.",
      "Khi khẩn cấp, F-Mood KHÔNG để AI tự trả lời, mà dùng câu soạn sẵn do thầy cô duyệt, kèm số điện thoại hỗ trợ.",
      "Tư vấn viên đọc được đoạn có vấn đề để xử lý. GVCN chỉ biết là có cảnh báo, không đọc được nội dung. Email cũng không kèm nội dung.",
      "Nếu AI mất mạng, app không bao giờ coi là \"ổn\": không chắc thì coi là cần để ý.",
    ],
  },
  {
    slug: "bi-mat",
    href: "/staff/trinh-dien/bi-mat",
    emoji: "🔒",
    title: "Bí mật được giữ thế nào",
    question: "Bạn khác, hay thầy cô, có đọc được chuyện riêng của em không?",
    minutes: 1.5,
    doThis: ["Bấm Chạy kiểm tra thật. Đợi bảng hiện toàn dấu ✅.", "Chỉ cột \"GVCN thấy gì\" và các ô bị ẩn vì dưới 5 bạn."],
    say: [
      "Bây giờ máy chủ đăng nhập THẬT bằng bạn Cá Heo, rồi gọi thẳng vào cơ sở dữ liệu, giống một bạn cố tình \"hack\", để đọc và sửa dữ liệu của bạn Mèo Mướp.",
      "Lần nào cũng bị chặn. Không phải do giao diện giấu đi, mà do chính cơ sở dữ liệu từ chối (Row Level Security).",
      "Trước khi thử, app kiểm tra đối chứng: Cá Heo vẫn đọc được dữ liệu của chính mình, và Mèo Mướp thật sự có dữ liệu. Nên \"0 dòng\" là bị chặn thật.",
    ],
  },
  {
    slug: "day-may",
    href: "/staff/trinh-dien/day-may",
    emoji: "📚",
    title: "Trợ lý được dạy thế nào",
    question: "Ai quyết định trợ lý nói gì? Làm sao biết trợ lý trả lời đúng?",
    minutes: 1.5,
    doThis: ["Chỉ các lớp lời dặn từ trên xuống.", "Ở Dạy thử: bấm Thử, so câu trả lời Trước và Sau."],
    say: [
      "Trợ lý (Sóc, Cú hay Kiến) không tự học từ tin nhắn của học sinh. Trợ lý được thầy cô dạy bằng lời dặn, hướng dẫn theo chủ đề và tài liệu đã duyệt.",
      "Có một phần luật cố định không ai sửa được, để không ai \"dụ\" trợ lý bỏ luật.",
      "Mỗi lần sửa, thầy cô chạy lại bộ câu thử: 61 câu về an toàn và 20 câu về cách trả lời.",
      "Dạy thử không lưu gì: trợ lý thật của các bạn vẫn giữ nguyên.",
    ],
  },
  {
    slug: "hieu-qua",
    href: "/staff/research/hieu-qua",
    emoji: "🎯",
    title: "App có giúp được không",
    question: "Làm sao biết app có hiệu quả?",
    minutes: 1,
    doThis: ["Chỉ 3 ô Đạt / Chưa đạt / Chưa đủ dữ liệu.", "Kéo xuống phần So với lớp không dùng app."],
    say: [
      "Đây vẫn là dữ liệu MẪU, để cho thấy cách tính. Kết quả thật sẽ có sau khi lớp 8A1 dùng thử và lớp 8A4 làm lớp so sánh.",
      "Mục tiêu đặt trước khi có số liệu. Có chỉ số Chưa đạt và Chưa đủ dữ liệu: app không làm đẹp con số.",
      "Lớp không dùng app cũng làm phiếu trước và sau, để biết thay đổi là nhờ app chứ không phải tự nhiên.",
    ],
  },
];

export const DEMO_STEPS = DEMO_SECTIONS.filter((s) => s.href.startsWith("/staff/trinh-dien/"));

export const totalMinutes = () => DEMO_SECTIONS.reduce((s, x) => s + x.minutes, 0);
