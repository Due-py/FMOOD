import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Bong bóng lời thoại của nhân vật trò chuyện. */
export function SpeechBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
