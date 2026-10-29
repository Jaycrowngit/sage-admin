/**
 * Parses question banks in the same formats accepted by the backend's
 * python_service/bulk_question_parser.py:
 *
 * CSV:  question_text,option_a,option_b,option_c,option_d,correct_option,marks,explanation
 *       (option_e / option_f columns are also accepted)
 * JSON: [{ question_text, explanation?, marks?, options: [{ letter, text, is_correct }] }]
 */

import type { QuestionPayload } from "./types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** RFC 4180-style CSV parser (quoted fields, escaped quotes, newlines inside quotes) */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseCSV(text: string): QuestionPayload[] {
  const rows = parseCSVRows(text.replace(/^﻿/, ""));
  if (rows.length < 2) throw new Error("The CSV file has no question rows.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("question_text") === -1 || col("correct_option") === -1) {
    throw new Error("CSV must include 'question_text' and 'correct_option' columns.");
  }

  return rows.slice(1).map((cells, idx) => {
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const correct = get("correct_option").toUpperCase();
    const options = LETTERS.map((letter) => ({
      letter,
      text: get(`option_${letter.toLowerCase()}`),
      is_correct: letter === correct,
    })).filter((o) => o.text !== "");

    const marks = parseFloat(get("marks"));
    const question: QuestionPayload = {
      question_text: get("question_text"),
      explanation: get("explanation") || undefined,
      marks: Number.isFinite(marks) ? marks : undefined,
      options,
    };
    validate(question, idx);
    return question;
  });
}

function parseJSON(text: string): QuestionPayload[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON. Check for missing commas or quotes.");
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) throw new Error("JSON must be an array of questions (or { \"questions\": [...] }).");

  return list.map((raw, idx) => {
    const q = raw as Record<string, unknown>;
    const opts = Array.isArray(q.options) ? (q.options as Record<string, unknown>[]) : [];
    const question: QuestionPayload = {
      question_text: String(q.question_text ?? "").trim(),
      explanation: q.explanation ? String(q.explanation) : undefined,
      marks: q.marks !== undefined && q.marks !== null ? Number(q.marks) : undefined,
      options: opts.map((o, oi) => ({
        letter: String(o.letter ?? o.option_letter ?? LETTERS[oi] ?? oi + 1).toUpperCase(),
        text: String(o.text ?? o.option_text ?? "").trim(),
        is_correct: Boolean(o.is_correct),
      })),
    };
    validate(question, idx);
    return question;
  });
}

function validate(q: QuestionPayload, idx: number) {
  const label = `Question #${idx + 1}`;
  if (!q.question_text) throw new Error(`${label} is missing question text.`);
  if (q.options.length < 2) throw new Error(`${label} needs at least 2 options.`);
  if (q.options.some((o) => !o.text)) throw new Error(`${label} has an empty option.`);
  if (!q.options.some((o) => o.is_correct)) throw new Error(`${label} has no correct answer indicated.`);
  if (q.marks !== undefined && (!Number.isFinite(q.marks) || q.marks < 0.5)) {
    throw new Error(`${label} has invalid marks (minimum 0.5).`);
  }
}

export function parseQuestionBank(text: string, filename = ""): QuestionPayload[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nothing to import.");
  const looksJSON = filename.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{");
  return looksJSON ? parseJSON(trimmed) : parseCSV(trimmed);
}
