import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { catalogWhere, toPublicListing, type PublicListing } from "./access";
import { MARGIN_RANGES, ebitdaRanges, inRanges, salesRanges } from "./domain";

export type CatalogFilters = {
  q: string;
  sector: string[];
  region: string[];
  deal: string[];
  sales: string[];
  ebitda: string[];
  margin: string[];
  price: number;
  currency: string;
  sort: string;
  fav: boolean;
};

const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? "";
  return {
    q: one("q").slice(0, 120),
    sector: arr(sp.sector),
    region: arr(sp.region),
    deal: arr(sp.tipo),
    sales: arr(sp.ventas),
    ebitda: arr(sp.ebitda),
    margin: arr(sp.margen),
    price: Number(one("precio")) || 0,
    currency: one("moneda") === "MXN" ? "MXN" : "USD",
    sort: ["reciente", "ventas", "ebitda", "margen"].includes(one("orden")) ? one("orden") : "reciente",
    fav: one("favoritas") === "1",
  };
}

export type CatalogItem = PublicListing & {
  nda: string;
  ndaMethod: string | null;
  access: string;
  saved: boolean;
  isOwn: boolean;
};

/**
 * Catálogo filtrado en el servidor. Los filtros y el orden solo usan valores que
 * el usuario puede ver: una métrica confidencial nunca coincide con un filtro,
 * para que no pueda deducirse por descarte.
 */
export async function getCatalog(user: CurrentUser, f: CatalogFilters) {
  const rows = await db.listing.findMany({
    where: catalogWhere(user),
    include: {
      documents: { where: { kind: "teaser" }, select: { id: true } },
      engagements: { where: { userId: user.id }, include: { nda: { select: { method: true } } } },
      favorites: { where: { userId: user.id }, select: { userId: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const items: CatalogItem[] = rows.map((l) => {
    const e = l.engagements[0];
    const authorized = e?.accessStatus === "autorizado" && e.ndaStatus === "firmado";
    const isOwn = l.ownerId === user.id;
    // En el catálogo nunca se exponen datos confidenciales, ni siquiera a autorizados.
    const p = toPublicListing(l, false, l.documents.length > 0);
    if (authorized || isOwn) {
      const full = toPublicListing(l, true, l.documents.length > 0);
      Object.assign(p, { sales: full.sales, ebitda: full.ebitda, margin: full.margin, priceMin: full.priceMin, priceMax: full.priceMax, negotiable: full.negotiable, hidden: full.hidden });
    }
    return {
      ...p,
      confidential: null,
      nda: e?.ndaStatus ?? "none",
      ndaMethod: e?.nda?.method ?? null,
      access: e?.accessStatus ?? "none",
      saved: l.favorites.length > 0,
      isOwn,
    };
  });

  const q = f.q.trim().toLowerCase();
  const money = f.sales.length > 0 || f.ebitda.length > 0 || f.price > 0;
  let res = items.filter((o) => {
    if (f.fav && !o.saved) return false;
    if (q && !`${o.code} ${o.title} ${o.sector} ${o.region} ${o.summary} ${o.dealType}`.toLowerCase().includes(q)) return false;
    if (f.sector.length && !f.sector.includes(o.sector ?? "")) return false;
    if (f.region.length && !f.region.includes(o.region ?? "")) return false;
    if (f.deal.length && !f.deal.includes(o.dealType ?? "")) return false;
    // Los filtros de monto aplican a la moneda seleccionada; no convertimos monedas.
    if (money && o.currency !== f.currency) return false;
    if (f.sales.length && (o.sales == null || !inRanges(o.sales, salesRanges(f.currency), f.sales))) return false;
    if (f.ebitda.length && (o.ebitda == null || !inRanges(o.ebitda, ebitdaRanges(f.currency), f.ebitda))) return false;
    if (f.margin.length && (o.margin == null || !inRanges(o.margin, MARGIN_RANGES, f.margin))) return false;
    if (f.price && (o.priceMin == null || o.priceMin > f.price)) return false;
    return true;
  });
  const v = (x: number | null) => (x == null ? -Infinity : x);
  const sorters: Record<string, (a: CatalogItem, b: CatalogItem) => number> = {
    reciente: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    // Ordenar montos entre monedas distintas sería engañoso: primero la moneda elegida.
    ventas: (a, b) => Number(b.currency === f.currency) - Number(a.currency === f.currency) || v(b.sales) - v(a.sales),
    ebitda: (a, b) => Number(b.currency === f.currency) - Number(a.currency === f.currency) || v(b.ebitda) - v(a.ebitda),
    margen: (a, b) => v(b.margin) - v(a.margin),
  };
  res = res.sort(sorters[f.sort]);
  return { items: res, total: items.length };
}
