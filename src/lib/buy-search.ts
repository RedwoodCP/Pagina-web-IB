import type { BuySearch, Listing } from "@prisma/client";
import { parseJson } from "./format";
import type { Badge } from "./domain";

export const BUY_SEARCH_BADGE: Record<string, Badge> = {
  activa: { label: "Activa", tone: "ok", icon: "travel_explore" },
  pausada: { label: "Pausada", tone: "warn", icon: "pause_circle" },
  cerrada: { label: "Cerrada", tone: "neutral", icon: "check_circle" },
};

export const INTL_OPS: Record<string, string> = {
  indistinto: "Indistinto",
  requerida: "Debe operar en otros países",
  no: "Solo operación nacional",
};

/** Resultado de un criterio: cumple, no cumple o la oportunidad no tiene el dato. */
export type Check = { label: string; result: "si" | "no" | "sin_dato"; detail: string };

export type BuyCriteria = ReturnType<typeof criteria>;

export function criteria(b: BuySearch) {
  return {
    regions: parseJson<string[]>(b.regions, []),
    sectors: parseJson<string[]>(b.sectors, []),
    employees: parseJson<string[]>(b.employees, []),
  };
}

const inside = (v: number, min: number | null, max: number | null) => (min == null || v >= min) && (max == null || v <= max);

export function marginOf(l: Pick<Listing, "sales" | "ebitda">): number | null {
  return l.sales && l.sales > 0 && l.ebitda != null ? (l.ebitda / l.sales) * 100 : null;
}

/**
 * Compara una oportunidad con la búsqueda. Los obligatorios deben cumplirse todos;
 * los opcionales solo se evalúan si la búsqueda los define, y suman puntos.
 * Las cifras solo se comparan en la misma moneda (no se hace conversión cambiaria).
 */
export function matchListing(b: BuySearch, l: Listing) {
  const c = criteria(b);
  const required: Check[] = [];
  const optional: Check[] = [];
  const m = marginOf(l);
  const sameCur = l.currency === b.currency;

  required.push({ label: "Industria", result: l.sector ? (c.sectors.includes(l.sector) ? "si" : "no") : "sin_dato", detail: l.sector ?? "—" });
  required.push({ label: "Región", result: l.region ? (c.regions.includes(l.region) ? "si" : "no") : "sin_dato", detail: l.region ?? "—" });
  required.push({
    label: "Ventas",
    result: l.sales == null ? "sin_dato" : !sameCur ? "no" : inside(l.sales, b.salesMin, b.salesMax) ? "si" : "no",
    detail: !sameCur ? `Cifras en ${l.currency}` : l.sales == null ? "—" : `${l.sales} M`,
  });
  required.push({ label: "Margen EBITDA", result: m == null ? "sin_dato" : inside(m, b.marginMin, b.marginMax) ? "si" : "no", detail: m == null ? "—" : `${m.toFixed(1)}%` });

  if (b.debtEbitdaMax != null)
    optional.push({ label: "Deuda / EBITDA", result: l.debtToEbitda == null ? "sin_dato" : l.debtToEbitda <= b.debtEbitdaMax ? "si" : "no", detail: l.debtToEbitda == null ? "—" : `${l.debtToEbitda}x` });
  if (c.employees.length)
    optional.push({ label: "Empleados", result: !l.employees ? "sin_dato" : c.employees.includes(l.employees) ? "si" : "no", detail: l.employees ?? "—" });
  if (b.intlOps !== "indistinto")
    optional.push({
      label: "Operación en otros países",
      result: l.intlOps == null ? "sin_dato" : l.intlOps === (b.intlOps === "requerida") ? "si" : "no",
      detail: l.intlOps == null ? "—" : l.intlOps ? "Sí" : "No",
    });
  if (b.topClientMax != null)
    optional.push({ label: "Cliente principal", result: l.topClientPct == null ? "sin_dato" : l.topClientPct <= b.topClientMax ? "si" : "no", detail: l.topClientPct == null ? "—" : `${l.topClientPct}% de ventas` });

  return {
    ok: required.every((r) => r.result === "si"),
    required,
    optional,
    score: optional.filter((o) => o.result === "si").length,
  };
}

const n = (v: number) => v.toLocaleString("es-MX", { maximumFractionDigits: 2 });

export function rangeText(min: number | null, max: number | null, unit: string): string {
  if (min != null && max != null) return `${n(min)} – ${n(max)}${unit}`;
  if (min != null) return `Desde ${n(min)}${unit}`;
  if (max != null) return `Hasta ${n(max)}${unit}`;
  return "—";
}

/**
 * Coincidencia vista por el comprador: usa solo lo que ese comprador puede ver de la oportunidad
 * (lo que llega en el catálogo). Una cifra confidencial nunca se compara, para no revelar su rango.
 * Los criterios opcionales se basan en datos confidenciales; solo se evalúa el número de empleados.
 */
export function matchPublic(
  b: BuySearch,
  o: { sector: string | null; region: string | null; currency: string; sales: number | null; margin: number | null; employees: string | null },
) {
  const c = criteria(b);
  const sameCur = o.currency === b.currency;
  const required: Check[] = [
    { label: "Industria", result: o.sector ? (c.sectors.includes(o.sector) ? "si" : "no") : "sin_dato", detail: o.sector ?? "—" },
    { label: "Región", result: o.region ? (c.regions.includes(o.region) ? "si" : "no") : "sin_dato", detail: o.region ?? "—" },
    {
      label: "Ventas",
      result: o.sales == null ? "sin_dato" : !sameCur ? "no" : inside(o.sales, b.salesMin, b.salesMax) ? "si" : "no",
      detail: o.sales == null ? "Confidencial" : !sameCur ? `Cifras en ${o.currency}` : `${o.sales} M`,
    },
    { label: "Margen EBITDA", result: o.margin == null ? "sin_dato" : inside(o.margin, b.marginMin, b.marginMax) ? "si" : "no", detail: o.margin == null ? "Confidencial" : `${o.margin.toFixed(1)}%` },
  ];
  const optional: Check[] = c.employees.length
    ? [{ label: "Empleados", result: !o.employees ? "sin_dato" : c.employees.includes(o.employees) ? "si" : "no", detail: o.employees ?? "—" }]
    : [];
  return { ok: required.every((r) => r.result === "si"), required, optional, score: optional.filter((x) => x.result === "si").length };
}
