// Biểu tượng thói quen: có sẵn hoặc tự gõ đúng một emoji. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { HABIT_ICON_GROUPS, HABIT_ICONS, isHabitIcon } from "./habit-icons";

test("các biểu tượng cũ vẫn dùng được, không trùng nhau", () => {
  for (const old of ["📖", "💧", "🏃", "🧘", "😴", "🎨", "🎵", "🥗", "✍️", "🌱", "🧹", "📵"]) assert.ok(HABIT_ICONS.includes(old), old);
  assert.equal(new Set(HABIT_ICONS).size, HABIT_ICONS.length);
  assert.ok(HABIT_ICON_GROUPS.every((g) => g.icons.length > 0));
});

test("tự gõ: nhận đúng một emoji (kể cả emoji ghép), không nhận chữ, số, nhiều emoji", () => {
  for (const ok of ["🦄", "🧑‍🍳", "👍🏽", "🏳️‍🌈", "❤️"]) assert.equal(isHabitIcon(ok), true, ok);
  for (const bad of ["", "a", "1", "ab", "🦄🦄", "<b>", "x🦄", " "]) assert.equal(isHabitIcon(bad), false, bad);
});
