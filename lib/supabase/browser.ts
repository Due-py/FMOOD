import { createBrowserClient } from "@supabase/ssr";
import { applyRemember, REMEMBER_COOKIE, wantsRemember } from "@/lib/remember";

function readCookies() {
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      return { name: decodeURIComponent(pair.slice(0, i)), value: decodeURIComponent(pair.slice(i + 1)) };
    });
}

/** Client Supabase trong trình duyệt (chỉ dùng để đăng nhập). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: readCookies,
        setAll(cookiesToSet) {
          const remember = wantsRemember(readCookies().find((c) => c.name === REMEMBER_COOKIE)?.value);
          for (const { name, value, options } of cookiesToSet) {
            const o = applyRemember(options, remember) ?? {};
            let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`;
            if (o.maxAge !== undefined) cookie += `; Max-Age=${o.maxAge}`;
            if (o.domain) cookie += `; Domain=${o.domain}`;
            cookie += `; SameSite=${typeof o.sameSite === "string" ? o.sameSite : "Lax"}`;
            if (o.secure || location.protocol === "https:") cookie += "; Secure";
            document.cookie = cookie;
          }
        },
      },
    },
  );
}
