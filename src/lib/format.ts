import { CURRENCY_PREFIX } from "./domain";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Zona horaria de la plataforma (los servidores en la nube suelen trabajar en UTC). */
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || process.env.APP_TIMEZONE || "America/Mexico_City";

/** Partes de una fecha en la zona horaria de la plataforma. */
export function zoned(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday!);
  return { year: +p.year!, month: +p.month! - 1, day: +p.day!, hour: +p.hour!, minute: +p.minute!, weekday: wd };
}

/** Interpreta «AAAA-MM-DDTHH:mm» (campo datetime-local) como hora de la plataforma. */
export function parseLocalDateTime(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const z = zoned(new Date(guess));
  const asUtc = Date.UTC(z.year, z.month, z.day, z.hour, z.minute);
  return new Date(guess - (asUtc - guess));
}

export function fmtDate(d: Date | string | null | undefined, withYear = true): string {
  if (!d) return "—";
  const z = zoned(typeof d === "string" ? new Date(d) : d);
  return `${String(z.day).padStart(2, "0")} ${MONTHS[z.month]}${withYear ? " " + z.year : ""}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  const z = zoned(x);
  return `${fmtDate(x)} · ${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`;
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
