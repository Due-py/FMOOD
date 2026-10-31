// Kiểm tra bộ lọc từ khóa. Chạy: npm test
// Khi thêm cụm từ mới vào keywords.ts, thêm câu thử vào đây: cả câu NÊN bắt
// và câu nói quá / nói đùa KHÔNG được bắt. Tất cả là câu tự đặt để thử, không lấy từ học sinh thật.
import assert from "node:assert/strict";
import { test } from "node:test";
import { keywordCheck, type RiskLevel } from "./keywords";
import { normalizeForMatch } from "./normalize";

const CASES: [string, RiskLevel][] = [
  // ── nguy hiểm: có dấu ──
  ["Mình muốn chết", "urgent"],
  ["dạo này em không muốn sống nữa", "urgent"],
  ["tớ nghĩ tới chuyện tự tử", "urgent"],
  ["Mình bị bố đánh đập", "urgent"],
  ["có lúc mình muốn tự làm đau bản thân", "urgent"],
  ["dạo này mình hay tự làm đau bản thân cho đỡ khó chịu", "urgent"],
  ["minh khong muon tinh day nua", "urgent"],
  ["tối nay mình sẽ kết thúc mọi chuyện", "urgent"],
  ["mình mệt mỏi với mọi thứ rồi, chẳng còn lý do gì để cố nữa", "urgent"],
  ["mình đã viết thư tạm biệt cho bố mẹ rồi", "urgent"],
  ["nhiều lúc chỉ muốn chết", "urgent"],
  ["mình không muốn tồn tại nữa", "urgent"],
  ["có người lạ đòi mình gửi ảnh nóng", "urgent"],
  ["nó dọa tung ảnh riêng tư của mình", "urgent"],
  // ── nguy hiểm: không dấu, viết tắt, kéo dài chữ ──
  ["minh muon chet", "urgent"],
  ["k mún sống nữa", "urgent"],
  ["ko mun song", "urgent"],
  ["mk hok muon song nua", "urgent"],
  ["chắc mk tu tu thôi... à không, mk muốn tự tử", "urgent"],
  ["minh dang nghi den chuyen tu tu", "urgent"],
  ["MÌNH MUỐN CHẾTTTT", "urgent"],
  ["e muon chet that su", "urgent"],
  ["toi muon tu sat", "urgent"],
  ["i want to unalive myself", "urgent"],
  ["chắc mình nhảy lầu cho xong", "urgent"],
  ["minh da rach tay may lan roi", "urgent"],
  // ── đáng lo ──
  ["Mình bị bắt nạt ở lớp", "concern"],
  ["hôm qua bị mẹ đánh vì điểm kém", "concern"],
  ["bố mình uống rượu xong hay đánh mình, mình sợ về nhà lắm", "concern"],
  ["minh bi tay chay het ca lop, khong ai choi voi minh", "concern"],
  ["mk bi bat nat suot", "concern"],
  ["mấy tuần nay đêm nào mình cũng khóc", "concern"],
  ["mình thấy mình là gánh nặng của cả nhà", "concern"],
  ["tụi nó dọa tung tin đồn về mình", "concern"],
  ["bị anh lớp trên đe dọa", "concern"],
  // ── nói quá / chuyện thường: KHÔNG được báo ──
  ["Mệt muốn chết luôn á", "none"],
  ["chán chết đi được", "none"],
  ["chán chết", "none"],
  ["bài khó muốn chết", "none"],
  ["bai kho muon chet", "none"],
  ["đói muốn chết", "none"],
  ["nóng chết mất", "none"],
  ["cười muốn chết luôn 💀", "none"],
  ["mình muốn chết cười với clip này", "none"],
  ["mình muốn chết vì xấu hổ luôn", "none"],
  ["hôm nay học thêm 3 ca liền, mệt muốn chết luôn á", "none"],
  ["bài tập về nhà nhiều vãi, chắc tui chết chìm trong đống bài mất", "none"],
  ["điểm kém thế này chắc mẹ giết mình mất haha", "none"],
  ["ước gì được biến mất khỏi buổi thuyết trình ngày mai 😭", "none"],
  ["toi met qua, hom nay chay 3 vong san", "none"],
  ["từ từ thôi, mình muốn từ từ tìm hiểu", "none"],
  ["tu tu thoi ban oi", "none"],
  // "tu tu" không dấu đi tiếp một việc làm là "từ từ" (dần dần), không phải "tự tử"
  ["minh se tu tu hoc lai tu dau, khong sao dau", "none"],
  ["minh muon tu tu thoi, khong voi", "none"],
  ["minh muon tu tu", "urgent"],
  ["chac minh se tu tu cho xong", "urgent"],
  ["bài này bị đánh giá thấp quá", "none"],
  ["sáng nay bị đánh thức sớm", "none"],
  ["bị đánh rơi ví ở căng tin", "none"],
  ["đội mình bị đánh bại 3-0", "none"],
  ["mình không muốn sống ở thành phố này nữa, muốn về quê", "none"],
  ["lần cuối mình gặp nó là tuần trước", "none"],
  ["cảm ơn Sóc đã nói chuyện với mình", "none"],
  ["hôm nay vui ghê", "none"],
];

for (const [text, expected] of CASES) {
  test(`"${text}" → ${expected}`, () => {
    assert.equal(keywordCheck(text).level, expected);
  });
}

test("chuẩn hóa: bỏ dấu, mở viết tắt, gộp chữ kéo dài", () => {
  assert.equal(normalizeForMatch("K mún sốnggg nữaaa!!"), "khong muon song nua");
  assert.equal(normalizeForMatch("Mk hok bít j"), "minh khong bit gi");
  assert.equal(normalizeForMatch("Tự tử"), "tutu");
  // "từ từ" giữ nguyên dấu để không nhầm với "tự tử"
  assert.equal(normalizeForMatch("từ từ"), "từ từ");
});

test("cụm từ admin thêm: bắt cả khi gõ không dấu", () => {
  const extra = { urgent: ["cho hết đồ đạc"], concern: [] };
  assert.equal(keywordCheck("minh da cho het do dac roi", extra).level, "urgent");
  assert.equal(keywordCheck("mình đã cho hết đồ đạc rồi", extra).level, "urgent");
});
