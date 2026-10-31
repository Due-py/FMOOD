// Bộ lọc trang Duyệt bài thư viện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_FILTER, filterLessons, filterOptions, isFiltering, type FilterableLesson } from "./lesson-review-filter";

const L = (p: Partial<FilterableLesson> & { title: string }): FilterableLesson => ({
  body: "",
  grade: 6,
  topic: "Chăm sóc cơ thể",
  source: "Oxford Wellbeing 6",
  published: true,
  author_name: null,
  ...p,
});
const items = [
  L({ title: "Vệ sinh giấc ngủ", body: "ngủ đủ 9–12 tiếng" }),
  L({ title: "Bữa ăn lành mạnh", grade: 7, topic: "Dinh dưỡng" }),
  L({ title: "Bài của lớp 8A1", grade: null, author_name: "Cô Thúy", source: "" }),
  L({ title: "Nháp", published: false }),
];

test("không lọc gì: giữ nguyên", () => {
  assert.equal(filterLessons(items, EMPTY_FILTER).length, 4);
  assert.equal(isFiltering(EMPTY_FILTER), false);
});

test("tìm không phân biệt dấu, theo tên hoặc nội dung", () => {
  assert.deepEqual(filterLessons(items, { ...EMPTY_FILTER, q: "giac ngu" }).map((l) => l.title), ["Vệ sinh giấc ngủ"]);
  assert.deepEqual(filterLessons(items, { ...EMPTY_FILTER, q: "12 tiếng" }).map((l) => l.title), ["Vệ sinh giấc ngủ"]);
});

test("lọc theo lớp (kể cả bài không gắn lớp), chủ đề, nguồn, loại bài, đăng", () => {
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, grade: "7" }).length, 1);
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, grade: "chung" })[0].title, "Bài của lớp 8A1");
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, topic: "Dinh dưỡng" }).length, 1);
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, source: "chua" }).length, 1);
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, kind: "gvcn" }).length, 1);
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, published: "chua" })[0].title, "Nháp");
  assert.equal(filterLessons(items, { ...EMPTY_FILTER, grade: "6", published: "da" }).length, 1);
});

test("lựa chọn lấy từ danh sách bài", () => {
  const o = filterOptions(items);
  assert.deepEqual(o.grades, ["6", "7"]);
  assert.deepEqual(o.topics, ["Chăm sóc cơ thể", "Dinh dưỡng"]);
  assert.equal(o.hasUngraded, true);
});
