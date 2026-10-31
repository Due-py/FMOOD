// Nhìn lại và vận dụng (Bước 4): hỏi lại sau 1–3 ngày, gợi ý tình huống mới, Hành trình theo kỹ năng. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { casesForSkill } from "@/lib/skills";
import { cleanNextTime, daysSince, dueFollowup, isUsed, NEXT_TIME_CHOICES, NEXT_TIME_MAX, skillJourney, suggestNextCase, type JourneySessionRow } from "./review";

test("điều sẽ chỉnh lần sau: gộp ô chọn nhanh và lời tự viết, bỏ ô lạ, không có gì thì null", () => {
  assert.equal(cleanNextTime(NEXT_TIME_CHOICES[1], ""), "Bắt đầu sớm hơn");
  assert.equal(cleanNextTime(NEXT_TIME_CHOICES[1], "  từ  thứ Hai "), "Bắt đầu sớm hơn: từ thứ Hai");
  assert.equal(cleanNextTime(null, "đặt báo thức"), "đặt báo thức");
  assert.equal(cleanNextTime("chọn bừa", "x"), null);
  assert.equal(cleanNextTime(null, null), null);
  assert.equal(cleanNextTime(null, "a".repeat(500))?.length, NEXT_TIME_MAX);
  assert.ok(isUsed("helped") && isUsed("not_yet") && !isUsed("done"));
});

test("hỏi lại bài luyện đúng 1–3 ngày sau khi hoàn thành (giờ Việt Nam), chỉ một lần, cũ nhất trước", () => {
  const now = new Date("2026-11-06T09:00:00+07:00");
  assert.equal(daysSince("2026-11-05T23:30:00+07:00", now), 1);
  assert.equal(daysSince("2026-11-06T00:10:00+07:00", now), 0);
  const row = (id: string, completed: string | null, extra: Partial<{ followup_at: string; state: "completed" | "paused" }> = {}) => ({
    id,
    state: extra.state ?? ("completed" as const),
    completed_at: completed,
    followup_at: extra.followup_at ?? null,
  });
  assert.equal(dueFollowup([row("a", "2026-11-06T07:00:00+07:00")], now), null, "hôm nay vừa xong: chưa hỏi");
  assert.equal(dueFollowup([row("a", "2026-11-02T07:00:00+07:00")], now), null, "quá 3 ngày: thôi hỏi");
  assert.equal(dueFollowup([row("a", "2026-11-04T07:00:00+07:00", { followup_at: "2026-11-05T07:00:00Z" })], now), null, "đã hỏi rồi");
  assert.equal(dueFollowup([row("a", "2026-11-04T07:00:00+07:00", { state: "paused" })], now), null, "chưa hoàn thành");
  const due = dueFollowup([row("new", "2026-11-05T07:00:00+07:00"), row("old", "2026-11-03T08:00:00+07:00")], now);
  assert.equal(due?.id, "old");
});

test("gợi ý tình huống mới: khác tình huống vừa luyện, cùng kỹ năng, ưu tiên tình huống chưa luyện", () => {
  for (const skill of ["K1", "K2", "K3", "K4"] as const) {
    const all = casesForSkill(skill).map((c) => c.code);
    const current = all[0];
    const next = suggestNextCase(skill, current, [current]);
    assert.ok(next, skill);
    assert.notEqual(next.code, current);
    assert.ok(next.skills.includes(skill));
  }
  // K4: TL04, TL06, TL11, TL12; đã luyện TL11 (vừa xong), TL04, TL06 → còn TL12 chưa luyện
  assert.equal(suggestNextCase("K4", "TL11", ["TL11", "TL04", "TL06"])?.code, "TL12");
  // luyện hết rồi: lấy tình huống luyện lâu nhất (cuối danh sách, vì danh sách mới trước)
  assert.equal(suggestNextCase("K4", "TL11", ["TL11", "TL12", "TL06", "TL04"])?.code, "TL04");
  // tình huống riêng (không có mã): vẫn gợi ý một tình huống mẫu
  assert.ok(suggestNextCase("K3", null, []));
});

test("Hành trình theo kỹ năng: đếm lần luyện, bài gần nhất lần 1 và lần 2, điều tự rút ra; không có điểm hay xếp hạng", () => {
  const base = { case_code: "TL09", situation: "Ba bài cùng hạn", next_try: null, completed_at: null } as const;
  const rows: JourneySessionRow[] = [
    {
      ...base,
      id: "s3",
      skill: "K3",
      state: "completed",
      next_try: "tối thứ Năm làm Toán trước",
      next_time: "Bắt đầu sớm hơn",
      followup_used: "helped",
      completed_at: "2026-11-05T10:00:00Z",
      updated_at: "2026-11-06T10:00:00Z",
      attempts: [
        { version: 1, answers: { tasks: "a" } },
        { version: 2, answers: { tasks: "b" } },
      ],
    },
    { ...base, id: "s2", skill: "K3", state: "paused", updated_at: "2026-11-04T10:00:00Z", attempts: [] },
    { ...base, id: "s1", skill: "K3", state: "not_started", updated_at: "2026-11-03T10:00:00Z", attempts: [] },
    { ...base, id: "s0", skill: "K1", state: "in_progress", updated_at: "2026-11-02T10:00:00Z", attempts: [{ version: 1, answers: { event: "x" } }] },
  ];
  const j = skillJourney(rows);
  assert.deepEqual(
    j.map((s) => s.skill),
    ["K1", "K2", "K3", "K4"],
  );
  const k3 = j[2];
  assert.equal(k3.practiced, 2, "không tính lần mở rồi đóng ngay");
  assert.equal(k3.completed, 1);
  assert.equal(k3.latest?.id, "s3");
  assert.deepEqual(k3.latest?.v1, { tasks: "a" });
  assert.deepEqual(k3.latest?.v2, { tasks: "b" });
  assert.deepEqual(
    k3.notes.map((n) => n.kind),
    ["next_time", "next_try"],
  );
  assert.equal(k3.usedForReal, 1);
  assert.equal(j[0].latest?.v2, null);
  assert.equal(j[1].practiced, 0);
  for (const s of j) assert.ok(!("rank" in s) && !("score" in s));
});
