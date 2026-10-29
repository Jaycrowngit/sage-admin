"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@/components/useQuery";
import { api } from "@/lib/api";
import { errorMessage, formatNumber } from "@/lib/format";
import { parseQuestionBank } from "@/lib/question-import";
import type { Question, QuestionPayload } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const MIN_OPTIONS = 2;

type OptionForm = { text: string; is_correct: boolean };
type QuestionForm = {
  question_text: string;
  marks: string;
  explanation: string;
  options: OptionForm[];
};

const emptyForm = (): QuestionForm => ({
  question_text: "",
  marks: "1",
  explanation: "",
  options: Array.from({ length: 4 }, () => ({ text: "", is_correct: false })),
});

const SAMPLE_CSV = `question_text,option_a,option_b,option_c,option_d,correct_option,marks,explanation
"Which word is a noun?","Quickly","Happiness","Run","Blue","B",1,"Happiness names a thing (an emotion)."`;

export default function QuestionsPage() {
  const { id: examId } = useParams<{ id: string }>();

  const fetchQuestions = useCallback(() => api.questions(examId), [examId]);
  const { data, loading, error, reload, setData } = useQuery(fetchQuestions, "Failed to load questions");
  const questions = useMemo(() => data?.questions ?? [], [data]);
  const exam = data?.exam;

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState("");
  const [bulkParsed, setBulkParsed] = useState<QuestionPayload[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

  function openAdd() {
    setForm(emptyForm());
    setFormError(null);
    setEditTarget(null);
    setModalMode("add");
  }

  function openEdit(q: Question) {
    const options = (q.options ?? []).map((o) => ({ text: o.option_text, is_correct: !!o.is_correct }));
    while (options.length < MIN_OPTIONS) options.push({ text: "", is_correct: false });
    setForm({
      question_text: q.question_text,
      marks: String(q.marks ?? 1),
      explanation: q.explanation ?? "",
      options,
    });
    setFormError(null);
    setEditTarget(q);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
  }

  function setOption(idx: number, patch: Partial<OptionForm>) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }));
  }

  function markCorrect(idx: number) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => ({ ...o, is_correct: i === idx })) }));
  }

  function addOption() {
    setForm((f) =>
      f.options.length >= LETTERS.length ? f : { ...f, options: [...f.options, { text: "", is_correct: false }] }
    );
  }

  function removeOption(idx: number) {
    setForm((f) => (f.options.length <= MIN_OPTIONS ? f : { ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.question_text.trim()) return setFormError("Question text is required.");
    const filled = form.options.filter((o) => o.text.trim());
    if (filled.length < MIN_OPTIONS) return setFormError("At least 2 options are required.");
    if (!filled.some((o) => o.is_correct)) return setFormError("Mark the correct answer (it must have text).");
    const marks = Number(form.marks);
    if (!Number.isFinite(marks) || marks < 0.5) return setFormError("Marks must be at least 0.5.");

    // Letters are re-assigned in order so removed/blank options never leave gaps.
    const payload: QuestionPayload = {
      question_text: form.question_text.trim(),
      marks,
      explanation: form.explanation.trim() || undefined,
      options: filled.map((o, i) => ({ letter: LETTERS[i], text: o.text.trim(), is_correct: o.is_correct })),
    };

    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "add") {
        await api.addQuestion(examId, payload);
      } else if (editTarget) {
        await api.updateQuestion(editTarget.id, payload);
      }
      closeModal();
      reload();
    } catch (err) {
      setFormError(errorMessage(err, "Failed to save question."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: Question) {
    if (!confirm("Delete this question?")) return;
    setDeletingId(q.id);
    try {
      await api.deleteQuestion(q.id);
      setData((prev) => (prev ? { ...prev, questions: prev.questions.filter((x) => x.id !== q.id) } : prev));
    } catch (err) {
      alert(errorMessage(err, "Failed to delete question."));
    } finally {
      setDeletingId(null);
    }
  }

  function openBulk() {
    setBulkText("");
    setBulkFile("");
    setBulkParsed(null);
    setBulkError(null);
    setBulkOpen(true);
  }

  function previewBulk(text: string, filename = bulkFile) {
    setBulkError(null);
    try {
      setBulkParsed(parseQuestionBank(text, filename));
    } catch (err) {
      setBulkParsed(null);
      setBulkError(errorMessage(err, "Could not read questions."));
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBulkFile(file.name);
    setBulkText(text);
    previewBulk(text, file.name);
  }

  async function submitBulk() {
    if (!bulkParsed || bulkParsed.length === 0) return;
    setBulkSaving(true);
    setBulkError(null);
    try {
      await api.bulkAddQuestions(examId, bulkParsed);
      setBulkOpen(false);
      reload();
    } catch (err) {
      setBulkError(errorMessage(err, "Bulk upload failed."));
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={exam?.title ?? "Exam Questions"}
        subtitle={
          <>
            {questions.length} question{questions.length !== 1 ? "s" : ""} · {formatNumber(totalMarks)} marks total
            {exam?.total_marks ? ` (exam set to ${exam.total_marks})` : ""} · Scores are calculated from question marks
          </>
        }
        back={{ href: "/exams", label: "Back to Exams" }}
        actions={
          <>
            <Link href={`/exams/${examId}/submissions`} className="admin-btn-secondary">
              Submissions
            </Link>
            <button className="admin-btn-secondary" onClick={openBulk}>
              Bulk Upload
            </button>
            <button className="admin-btn-primary" onClick={openAdd}>
              + Add Question
            </button>
          </>
        }
      />

      {error && <div className="admin-error-msg">{error}</div>}

      {loading && questions.length === 0 ? (
        <div className="admin-loading">Loading questions…</div>
      ) : questions.length === 0 ? (
        <div className="admin-empty boxed">No questions yet. Add one, or bulk upload a CSV/JSON question bank.</div>
      ) : (
        <div className="admin-question-list">
          {questions.map((q, i) => (
            <div key={String(q.id)} className="admin-question-card">
              <div className="admin-question-card-header">
                <span className="admin-question-number">Question {i + 1}</span>
                <span className="admin-question-marks">
                  {formatNumber(q.marks ?? 1)} mark{Number(q.marks ?? 1) !== 1 ? "s" : ""}
                </span>
              </div>

              <p className="admin-question-text">{q.question_text}</p>

              <div className="admin-question-options">
                {(q.options ?? []).map((opt, oi) => (
                  <div key={String(opt.id ?? oi)} className={`admin-question-option${opt.is_correct ? " correct" : ""}`}>
                    <span className={`admin-option-dot${opt.is_correct ? " correct" : ""}`} />
                    <span>
                      {opt.option_letter || LETTERS[oi]}. {opt.option_text}
                    </span>
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="admin-question-explanation">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}

              <div className="admin-question-actions">
                <button className="admin-btn-secondary" onClick={() => openEdit(q)}>
                  Edit
                </button>
                <button className="admin-btn-danger" onClick={() => handleDelete(q)} disabled={deletingId === q.id}>
                  {deletingId === q.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <Modal
          title={modalMode === "add" ? "Add Question" : "Edit Question"}
          onClose={closeModal}
          wide
          footer={
            <>
              <button className="admin-btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "add" ? "Add Question" : "Save Changes"}
              </button>
            </>
          }
        >
          {formError && <div className="admin-error-msg">{formError}</div>}

          <div className="admin-form-group">
            <label htmlFor="q-text">Question Text *</label>
            <textarea
              id="q-text"
              className="admin-form-textarea"
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              placeholder="Type the question here…"
              rows={3}
            />
          </div>

          <div className="admin-form-group admin-form-narrow">
            <label htmlFor="q-marks">Marks</label>
            <input
              id="q-marks"
              type="number"
              className="admin-form-input"
              value={form.marks}
              min={0.5}
              step={0.5}
              onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
            />
          </div>

          <div className="admin-form-group">
            <span className="admin-section-label">Answer Options — select the correct one</span>
            <div className="admin-options-list">
              {form.options.map((opt, idx) => (
                <div key={idx} className={`admin-option-row${opt.is_correct ? " correct" : ""}`}>
                  <span className="admin-option-letter">{LETTERS[idx]}</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => setOption(idx, { text: e.target.value })}
                    placeholder={`Option ${LETTERS[idx]}`}
                    aria-label={`Option ${LETTERS[idx]}`}
                  />
                  <label className="admin-option-correct-label">
                    <input type="radio" name="correct_option" checked={opt.is_correct} onChange={() => markCorrect(idx)} />
                    Correct
                  </label>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => removeOption(idx)}
                    disabled={form.options.length <= MIN_OPTIONS}
                    aria-label={`Remove option ${LETTERS[idx]}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {form.options.length < LETTERS.length && (
              <button type="button" className="admin-link-btn" onClick={addOption}>
                + Add option
              </button>
            )}
          </div>

          <div className="admin-form-group">
            <label htmlFor="q-explanation">Explanation (shown to students after marking)</label>
            <textarea
              id="q-explanation"
              className="admin-form-textarea"
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              placeholder="Why is this the correct answer?"
              rows={2}
            />
          </div>
        </Modal>
      )}

      {bulkOpen && (
        <Modal
          title="Bulk Upload Questions"
          onClose={() => setBulkOpen(false)}
          wide
          footer={
            <>
              <button className="admin-btn-secondary" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
                Cancel
              </button>
              <button
                className="admin-btn-primary"
                onClick={submitBulk}
                disabled={bulkSaving || !bulkParsed || bulkParsed.length === 0}
              >
                {bulkSaving ? "Uploading…" : `Upload ${bulkParsed?.length ?? 0} Question${bulkParsed?.length === 1 ? "" : "s"}`}
              </button>
            </>
          }
        >
          <p className="admin-form-hint">
            Upload a <strong>.csv</strong> or <strong>.json</strong> file, or paste its contents below. CSV columns:{" "}
            <code>question_text, option_a…option_d, correct_option, marks, explanation</code> (option_e/option_f
            optional).
          </p>

          <div className="admin-form-group">
            <input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} />
          </div>

          <div className="admin-form-group">
            <label htmlFor="bulk-text">Or paste CSV / JSON</label>
            <textarea
              id="bulk-text"
              className="admin-form-textarea mono"
              rows={8}
              value={bulkText}
              placeholder={SAMPLE_CSV}
              onChange={(e) => {
                setBulkText(e.target.value);
                setBulkFile("");
                setBulkParsed(null);
              }}
            />
            <button type="button" className="admin-link-btn" onClick={() => previewBulk(bulkText, "")}>
              Check & preview
            </button>
          </div>

          {bulkError && <div className="admin-error-msg">{bulkError}</div>}

          {bulkParsed && (
            <div className="admin-bulk-preview">
              <strong>
                {bulkParsed.length} question{bulkParsed.length === 1 ? "" : "s"} ready ·{" "}
                {formatNumber(bulkParsed.reduce((s, q) => s + (q.marks ?? 1), 0))} marks
              </strong>
              <ol>
                {bulkParsed.slice(0, 5).map((q, i) => (
                  <li key={i}>
                    {q.question_text}{" "}
                    <span className="cell-muted">
                      (answer: {q.options.find((o) => o.is_correct)?.letter ?? "?"})
                    </span>
                  </li>
                ))}
              </ol>
              {bulkParsed.length > 5 && <span className="cell-muted">…and {bulkParsed.length - 5} more</span>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
