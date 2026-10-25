// NHÁP BÀI TẬP: lưu tạm trên máy khi học sinh đang gõ, để lỡ tải lại trang không mất chữ.
// Gắn với từng học sinh; nộp xong thì xóa; đăng xuất thì xóa hết (máy dùng chung ở trường).

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const PREFIX = "fmood-nhap:";
const browser = (): Store | null => (typeof localStorage === "undefined" ? null : localStorage);

export function draftKey(userId: string, lessonId: string, exerciseId: string): string {
  return `${PREFIX}${userId}:${lessonId}:${exerciseId}`;
}

export function readDraft(key: string, store: Store | null = browser()): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Ghi nháp; chữ rỗng thì xóa nháp. */
export function writeDraft(key: string, text: string, store: Store | null = browser()) {
  try {
    if (text.trim()) store?.setItem(key, text);
    else store?.removeItem(key);
  } catch {}
}

export function clearDraft(key: string, store: Store | null = browser()) {
  try {
    store?.removeItem(key);
  } catch {}
}

/** Xóa mọi nháp trên máy (gọi khi đăng xuất). */
export function clearAllDrafts(store: Store | null = browser()) {
  try {
    if (!store) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) store.removeItem(k);
  } catch {}
}
