"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/profile";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { MascotMood } from "@/lib/mascot";

type Step = {
  mood: MascotMood;
  title: string;
  bubble: string;
  points: { emoji: string; text: string; bg: string }[];
};

export function Onboarding({ nickname }: { nickname: string }) {
  const steps: Step[] = [
    {
      mood: "cheer",
      title: `Chào ${nickname}!`,
      bubble: "Mình là Mây, bạn đồng hành của bạn trên F-Mood. Rất vui được làm quen!",
      points: [
        { emoji: "😊", text: "Mỗi ngày, ghé kể Mây nghe bạn thấy thế nào bằng vài emoji.", bg: "bg-butter" },
        { emoji: "💬", text: "Khi có chuyện muốn nói, trò chuyện với Mây bất cứ lúc nào.", bg: "bg-sky" },
        { emoji: "🔥", text: "Đặt thói quen nhỏ và giữ chuỗi ngày. Lỡ đứt thì làm lại!", bg: "bg-peach" },
      ],
    },
    {
      mood: "calm",
      title: "Chuyện của bạn là của bạn",
      bubble: "Mình biết chia sẻ không dễ, nên quyền riêng tư của bạn luôn được đặt lên đầu.",
      points: [
        { emoji: "🔒", text: "Thầy cô và bạn bè không đọc được nhật ký hay trò chuyện của bạn.", bg: "bg-mint" },
        { emoji: "🗑️", text: "Bạn có thể xóa cuộc trò chuyện hoặc toàn bộ dữ liệu bất cứ lúc nào.", bg: "bg-lilac" },
        {
          emoji: "🛟",
          text: "Chỉ khi có dấu hiệu nguy hiểm, thầy cô chủ nhiệm và phòng tham vấn mới được báo (kèm họ tên của bạn) để kịp giúp bạn. Khi đó F-Mood sẽ nói rõ cho bạn biết.",
          bg: "bg-sky",
        },
      ],
    },
    {
      mood: "happy",
      title: "Một điều cần nhớ",
      bubble: "Mây là bạn đồng hành, không phải bác sĩ hay chuyên gia đâu nhé.",
      points: [
        {
          emoji: "🤝",
          text: "F-Mood là công cụ hỗ trợ, không phải chuyên gia tâm lý và không thay thế thầy cô, bố mẹ.",
          bg: "bg-butter",
        },
        { emoji: "🤖", text: "Mây là AI nên đôi khi có thể trả lời chưa đúng.", bg: "bg-peach" },
        { emoji: "📞", text: "Khi thấy quá sức, hãy tìm người thật: thầy cô, bố mẹ hoặc gọi 111.", bg: "bg-mint" },
      ],
    },
  ];

  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-center gap-2" aria-label={`Bước ${index + 1} / ${steps.length}`}>
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-8 bg-brand" : "w-4 bg-line",
            )}
          />
        ))}
      </div>

      <div key={index} className="mt-8 flex-1 animate-[fadein_.35s_ease]">
        <div className="flex items-end gap-3">
          <May size={110} mood={step.mood} />
          <SpeechBubble className="mb-8">{step.bubble}</SpeechBubble>
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">{step.title}</h1>
        <ul className="mt-5 space-y-3">
          {step.points.map((p) => (
            <li key={p.text} className={cn("flex gap-3 rounded-3xl p-4", p.bg)}>
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              <span className="pt-0.5 leading-relaxed">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex gap-3">
        {index > 0 && (
          <button type="button" className={btn.secondary} onClick={() => setIndex(index - 1)}>
            Quay lại
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          className={cn(btn.primary, "flex-1")}
          onClick={() =>
            last ? startTransition(() => completeOnboarding()) : setIndex(index + 1)
          }
        >
          {last ? (pending ? "Đang vào…" : "Mình hiểu rồi, bắt đầu thôi!") : "Tiếp tục"}
        </button>
      </div>
    </div>
  );
}
