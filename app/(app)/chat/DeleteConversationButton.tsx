"use client";

import { useTransition } from "react";
import { deleteConversation } from "@/app/actions/chat";
import { TrashIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

export function DeleteConversationButton({
  id,
  goBack = false,
  className,
}: {
  id: string;
  goBack?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Xóa cuộc trò chuyện"
      title="Xóa cuộc trò chuyện"
      onClick={() => {
        if (confirm("Xóa vĩnh viễn cuộc trò chuyện này?")) {
          startTransition(() => deleteConversation(id, goBack));
        }
      }}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-40",
        className,
      )}
    >
      <TrashIcon size={18} />
    </button>
  );
}
