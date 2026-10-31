"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSurvey, saveSurvey, setSurveyStatus } from "@/app/actions/admin";
import { Field, SaveBar, StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { QUESTION_TYPE_LABEL, type Survey, type SurveyQuestion } from "@/lib/surveys";
import { classLabel } from "@/lib/class-tools";

const TEMPLATE: SurveyQuestion[] = [
  { id: "q1", type: "scale", text: "Bạn có tự dùng F-Mood được mà không cần ai hướng dẫn không?", required: true, options: [], minLabel: "Rất khó", maxLabel: "Rất dễ" },
  { id: "q2", type: "scale", text: "Sau khi check-in, bạn có biết mình nên làm gì tiếp theo không?", required: true, options: [], minLabel: "Không hề", maxLabel: "Rất rõ" },
  { id: "q3", type: "choice", text: "Khi cần giúp đỡ, bạn biết tìm đến ai không?", required: true, options: ["Biết rõ", "Biết một chút", "Chưa biết"], minLabel: "", maxLabel: "" },
  { id: "q4", type: "scale", text: "Bạn có thấy thông tin của mình được an toàn trên F-Mood không?", required: true, options: [], minLabel: "Không an toàn", maxLabel: "Rất an toàn" },
  { id: "q5", type: "text", text: "Bạn muốn F-Mood cải thiện điều gì?", required: false, options: [], minLabel: "", maxLabel: "" },
];

let counter = 0;
const newId = () => `q${Date.now().toString(36)}${counter++}`;

/** Mẫu cho giáo viên: hỏi nhanh cả lớp trong một phút. */
const CLASS_TEMPLATE: Omit<SurveyQuestion, "id">[] = [
  { type: "scale", text: "Tuần này em thấy thế nào?", required: true, options: [], minLabel: "Rất mệt", maxLabel: "Rất vui" },
  { type: "choice", text: "Điều gì khiến em bận lòng nhất tuần này?", required: true, options: ["Học tập, thi cử", "Bạn bè", "Gia đình", "Không có gì"], minLabel: "", maxLabel: "" },
  { type: "text", text: "Em muốn thầy cô biết điều gì? (không bắt buộc)", required: false, options: [], minLabel: "", maxLabel: "" },
];

/** forTeacher: giáo viên chủ nhiệm chỉ gửi cho lớp mình (không có "Mọi lớp"). */
export function SurveyBuilder({
  survey,
  classes,
  forTeacher = false,
}: {
  survey: Survey | null;
  classes: { id: string; name: string }[];
  forTeacher?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(survey?.questions ?? []);
  const [classIds, setClassIds] = useState<string[]>(survey?.class_ids ?? (forTeacher && classes[0] ? [classes[0].id] : []));
  const { pending, status, run } = useAction();

  const update = (i: number, patch: Partial<SurveyQuestion>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...questions];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setQuestions(next);
  };
  const add = (type: SurveyQuestion["type"]) =>
    setQuestions([...questions, { id: newId(), type, text: "", required: type !== "text", options: type === "choice" ? ["", ""] : [], minLabel: "", maxLabel: "" }]);

  return (
    <form
      action={() =>
        run(
          () => saveSurvey(survey?.id ?? null, { title, description, questions, class_ids: classIds.length ? classIds : null }),
          "Đã lưu phiếu.",
          (res) => {
            if (!survey && "id" in res) router.replace(`/staff/surveys/${res.id}`);
          },
        )
      }
      className="space-y-5"
    >
      <Field label="Tên phiếu">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="VD: Đánh giá sau 2 tuần dùng F-Mood" className={input} />
      </Field>
      <Field label="Lời mở đầu (không bắt buộc)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={input} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold">Gửi cho lớp</p>
        <div className="flex flex-wrap gap-2">
          {!forTeacher && (
            <button type="button" aria-pressed={classIds.length === 0} onClick={() => setClassIds([])} className={chip(classIds.length === 0)}>
              Mọi lớp
            </button>
          )}
          {classes.map((c) => {
            const on = classIds.includes(c.id);
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => setClassIds(on ? classIds.filter((x) => x !== c.id) : [...classIds, c.id])} className={chip(on)}>
                {classLabel(c.name)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-line p-5 text-center text-sm text-muted">
            Chưa có câu hỏi.{" "}
            <button
              type="button"
              onClick={() => setQuestions((forTeacher ? CLASS_TEMPLATE : TEMPLATE).map((q) => ({ ...q, id: newId() })))}
              className="font-semibold text-brand-strong underline dark:text-brand"
            >
              {forTeacher ? "Dùng 3 câu hỏi mẫu" : "Dùng mẫu đánh giá theo đề cương"}
            </button>
          </div>
        )}
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-lilac px-2.5 py-1 font-semibold">
                {i + 1}. {QUESTION_TYPE_LABEL[q.type]}
              </span>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="accent-[var(--brand)]" />
                Bắt buộc
              </label>
              <span className="ml-auto flex gap-1">
                <IconBtn label="Lên" disabled={i === 0} onClick={() => move(i, -1)}>↑</IconBtn>
                <IconBtn label="Xuống" disabled={i === questions.length - 1} onClick={() => move(i, 1)}>↓</IconBtn>
                <IconBtn label="Xóa câu" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>×</IconBtn>
              </span>
            </div>
            <input value={q.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Nội dung câu hỏi" aria-label="Nội dung câu hỏi" maxLength={1500} className={input} />
            {q.type === "scale" && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input value={q.minLabel} onChange={(e) => update(i, { minLabel: e.target.value })} placeholder="Nhãn cho 1 (VD: Rất khó)" aria-label="Nhãn điểm 1" className={input} />
                <input value={q.maxLabel} onChange={(e) => update(i, { maxLabel: e.target.value })} placeholder="Nhãn cho 5 (VD: Rất dễ)" aria-label="Nhãn điểm 5" className={input} />
              </div>
            )}
            {q.type === "choice" && (
              <div className="mt-2 space-y-2">
                {q.options.map((o, k) => (
                  <div key={k} className="flex gap-2">
                    <input
                      value={o}
                      onChange={(e) => update(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })}
                      placeholder={`Lựa chọn ${k + 1}`}
                      aria-label={`Lựa chọn ${k + 1}`}
                      className={cn(input, "py-2")}
                    />
                    <IconBtn label="Xóa lựa chọn" disabled={q.options.length <= 2} onClick={() => update(i, { options: q.options.filter((_, m) => m !== k) })}>×</IconBtn>
                  </div>
                ))}
                {q.options.length < 10 && (
                  <button type="button" onClick={() => update(i, { options: [...q.options, ""] })} className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
                    + Thêm lựa chọn
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(QUESTION_TYPE_LABEL) as SurveyQuestion["type"][]).map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className={btn.secondary}>
              + {QUESTION_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <SaveBar pending={pending} status={status} label={survey ? "Lưu phiếu" : "Tạo phiếu (dạng nháp)"} />
    </form>
  );
}

function chip(on: boolean) {
  return cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", on ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2");
}

function IconBtn({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...props} className="flex size-7 items-center justify-center rounded-full border border-line text-sm hover:bg-surface-2 disabled:opacity-30">
      {children}
    </button>
  );
}

export function SurveyStatusBar({ id, status, hasResponses }: { id: string; status: Survey["status"]; hasResponses: boolean }) {
  const router = useRouter();
  const { pending, status: msg, run } = useAction();
  const [deleting, startDelete] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-lilac p-4">
      <span className="mr-2 text-sm">
        Trạng thái: <strong>{status === "draft" ? "Nháp (học sinh chưa thấy)" : status === "open" ? "Đang mở" : "Đã đóng"}</strong>
      </span>
      {status !== "open" && (
        <button type="button" disabled={pending} onClick={() => run(() => setSurveyStatus(id, "open"), "Đã mở phiếu.")} className={btn.primary}>
          Mở cho học sinh
        </button>
      )}
      {status === "open" && (
        <button type="button" disabled={pending} onClick={() => run(() => setSurveyStatus(id, "closed"), "Đã đóng phiếu.")} className={btn.secondary}>
          Đóng phiếu
        </button>
      )}
      {status !== "draft" && !hasResponses && (
        <button type="button" disabled={pending} onClick={() => run(() => setSurveyStatus(id, "draft"), "Đã chuyển về nháp.")} className={btn.ghost}>
          Về nháp
        </button>
      )}
      <button
        type="button"
        disabled={deleting}
        onClick={() =>
          confirm(hasResponses ? "Xóa phiếu và TOÀN BỘ câu trả lời?" : "Xóa phiếu này?") &&
          startDelete(async () => {
            const res = await deleteSurvey(id);
            if (res.ok) router.replace("/staff/surveys");
          })
        }
        className={cn(btn.ghost, "ml-auto text-danger hover:bg-danger-soft hover:text-danger")}
      >
        Xóa phiếu
      </button>
      <StatusText status={msg} />
    </div>
  );
}
