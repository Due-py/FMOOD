// Giao diện sáng/tối: lưu lựa chọn trong localStorage, mặc định theo máy.
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "fmood-theme";

/** Script chạy trước khi trang hiện ra, để không bị nháy màu. */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
