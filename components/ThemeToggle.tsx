"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "Theo máy", Icon: MonitorIcon },
  { value: "light", label: "Sáng", Icon: SunIcon },
  { value: "dark", label: "Tối", Icon: MoonIcon },
];

function apply(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function readChoice(): ThemeChoice {
  try {
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice) || "system";
  } catch {
    return "system";
  }
}

/** Chọn giao diện Sáng / Tối / Theo máy. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu sau khi hydrate
    setChoice(readChoice());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readChoice() === "system") apply("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function select(value: ThemeChoice) {
    setChoice(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
    apply(value);
  }

  return (
    <div role="radiogroup" aria-label="Giao diện" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          onClick={() => select(value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
            choice === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
