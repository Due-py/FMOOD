// Nháp bài tập lưu trên máy (localStorage). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { clearAllDrafts, clearDraft, draftKey, readDraft, writeDraft } from "./drafts";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    m,
  };
}

test("nháp gắn với từng học sinh: bạn khác đăng nhập cùng máy không thấy", () => {
  const s = fakeStorage();
  writeDraft(draftKey("hs-a", "bai-1", "c1"), "nháp của A", s);
  assert.equal(readDraft(draftKey("hs-a", "bai-1", "c1"), s), "nháp của A");
  assert.equal(readDraft(draftKey("hs-b", "bai-1", "c1"), s), null);
});

test("nháp rỗng thì xóa luôn, nộp xong thì xóa nháp", () => {
  const s = fakeStorage();
  const k = draftKey("hs-a", "bai-1", "c1");
  writeDraft(k, "abc", s);
  writeDraft(k, "   ", s);
  assert.equal(readDraft(k, s), null);
  writeDraft(k, "abc", s);
  clearDraft(k, s);
  assert.equal(readDraft(k, s), null);
});

test("đăng xuất xóa mọi nháp, giữ các mục khác", () => {
  const s = fakeStorage();
  writeDraft(draftKey("hs-a", "bai-1", "c1"), "x", s);
  writeDraft(draftKey("hs-a", "bai-2", "c2"), "y", s);
  s.setItem("fmood:saved-login", "{}");
  clearAllDrafts(s);
  assert.deepEqual([...s.m.keys()], ["fmood:saved-login"]);
});

test("không có localStorage (chế độ riêng tư / bị chặn) thì không lỗi", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
    key: () => null,
    length: 0,
  };
  assert.equal(readDraft("k", broken), null);
  writeDraft("k", "x", broken);
  clearAllDrafts(broken);
});
