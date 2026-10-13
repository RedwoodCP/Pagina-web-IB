import { CURRENCY_PREFIX } from "./domain";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fmtDate(d: Date | string | null | undefined, withYear = true): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  const day = String(x.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[x.getMonth()]}${withYear ? " " + x.getFullYear() : ""}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  return `${fmtDate(x)} · ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Monto en millones con la moneda siempre visible: «US$ 18.4 M». */
export function fmtMoney(v: number | null | undefined, currency: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${CURRENCY_PREFIX[currency] ?? currency} ${nf.format(v)} M`;
}

export function fmtRange(min: number | null | undefined, max: number | null | undefined, currency: string): string {
  if (min == null || max == null) return "—";
  const p = CURRENCY_PREFIX[currency] ?? currency;
  const f = (n: number) => (Number.isInteger(n) ? n.toLocaleString("es-MX") : nf.format(n));
  return `${p} ${f(min)}–${f(max)} M`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return nf.format(v) + "%";
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function parseJson<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
