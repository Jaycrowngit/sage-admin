export function formatDate(value?: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 100) / 100}%`;
}

export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "—";
  return String(Math.round(Number(value) * 100) / 100);
}

/** ISO string -> value for <input type="datetime-local"> in the admin's local time */
export function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/** <input type="datetime-local"> value -> ISO string (UTC) for the API */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function downloadCSV(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (cell: string | number | null | undefined) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  // BOM so Excel opens UTF-8 names correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
