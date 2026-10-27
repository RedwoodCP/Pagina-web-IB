import "server-only";
import type { Engagement, Listing, ListingDocument, NdaSignature } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import type { CurrentUser } from "./auth";
import { parseJson } from "./format";

// ---------------------------------------------------------------------------
// Contexto de un usuario frente a una oportunidad. Toda decisión de permisos
// sale de aquí; la interfaz solo refleja lo que el servidor ya filtró.

export type ListingCtx = {
  user: CurrentUser;
  isAdmin: boolean;
  isOwner: boolean;
  /** dueño o colaborador «gestor»: puede editar y decidir accesos */
  canManage: boolean;
  /** dueño o cualquier colaborador: puede ver interesados */
  isTeam: boolean;
  engagement: (Engagement & { nda: NdaSignature | null }) | null;
  /** puede ver identidad, métricas confidenciales y sala de documentos */
  confidential: boolean;
};

type ListingWithTeam = Listing & { collaborators: { userId: string; role: string }[] };

export function buildCtx(
  user: CurrentUser,
  listing: ListingWithTeam,
  engagement: ListingCtx["engagement"],
): ListingCtx {
  const isOwner = listing.ownerId === user.id;
  const collab = listing.collaborators.find((c) => c.userId === user.id);
  const canManage = isOwner || collab?.role === "gestor";
  const isTeam = isOwner || !!collab;
  const authorized = engagement?.accessStatus === "autorizado" && engagement.ndaStatus === "firmado";
  return {
    user,
    isAdmin: user.isAdmin,
    isOwner,
    canManage,
    isTeam,
    engagement,
    confidential: user.isAdmin || isTeam || authorized,
  };
}

/** Condición Prisma de oportunidades visibles en el catálogo para este usuario. */
export function catalogWhere(user: CurrentUser) {
  return {
    status: "publicada",
    ...(env.showDemo ? {} : { isDemo: false }),
    ...(user.organizationId ? { exclusions: { none: { organizationId: user.organizationId } } } : {}),
  };
}

/**
 * Carga una oportunidad por su código anónimo para el usuario actual.
 * Devuelve null (→ 404) si no existe o si el usuario no debe saber que existe.
 */
export async function loadListing(code: string, user: CurrentUser) {
  const listing = await db.listing.findUnique({
    where: { code },
    include: { collaborators: { select: { userId: true, role: true } }, exclusions: true },
  });
  if (!listing) return null;
  const engagement = await db.engagement.findUnique({
    where: { listingId_userId: { listingId: listing.id, userId: user.id } },
    include: { nda: true },
  });
  const ctx = buildCtx(user, listing, engagement);
  const excluded = !!user.organizationId && listing.exclusions.some((e) => e.organizationId === user.organizationId);
  const visibleAsMember =
    listing.status === "publicada" && !excluded && (env.showDemo || !listing.isDemo);
  // Un comprador con proceso abierto conserva la vista aunque la oportunidad se retire.
  if (!ctx.isAdmin && !ctx.isTeam && !visibleAsMember && !engagement) return null;
  return { listing, ctx };
}

// ---------------------------------------------------------------------------
// Serialización segura: solo los campos que este usuario puede ver.

export type PublicListing = {
  id: string;
  code: string;
  status: string;
  isDemo: boolean;
  sector: string | null;
  region: string | null;
  country: string;
  title: string | null;
  summary: string | null;
  highlights: string[];
  dealType: string | null;
  yearsOperating: number | null;
  employees: string | null;
  currency: string;
  fiscalYear: number | null;
  sales: number | null;
  ebitda: number | null;
  margin: number | null;
  priceMin: number | null;
  priceMax: number | null;
  negotiable: boolean;
  hidden: { sales: boolean; ebitda: boolean; margin: boolean; price: boolean };
  publishedAt: string | null;
  hasTeaser: boolean;
  confidential: null | {
    legalName: string | null;
    city: string | null;
    foundedYear: number | null;
    ownership: string | null;
    advisorName: string | null;
    notes: string | null;
    history: { year: number; sales: number; ebitda: number }[];
  };
};

/**
 * Reglas de visibilidad de métricas. El margen se oculta también cuando revelaría
 * el EBITDA confidencial a partir de las ventas visibles (margen × ventas = EBITDA).
 */
export function metricVisibility(l: Listing, confidential: boolean) {
  if (confidential) return { sales: true, ebitda: true, margin: true, price: true };
  const sales = l.visSales === "miembros";
  const ebitda = l.visEbitda === "miembros";
  const margin = l.visMargin === "miembros" && (ebitda || !sales);
  const price = l.visPrice === "miembros";
  return { sales, ebitda, margin, price };
}

export function toPublicListing(l: Listing, confidential: boolean, hasTeaser: boolean): PublicListing {
  const v = metricVisibility(l, confidential);
  const margin = l.sales && l.ebitda != null && l.sales > 0 ? (l.ebitda / l.sales) * 100 : null;
  return {
    id: l.id,
    code: l.code,
    status: l.status,
    isDemo: l.isDemo,
    sector: l.sector,
    region: l.region,
    country: l.country,
    title: l.title,
    summary: l.summary,
    highlights: parseJson<string[]>(l.highlights, []),
    dealType: l.dealType,
    yearsOperating: l.yearsOperating,
    employees: l.employees,
    currency: l.currency,
    fiscalYear: l.fiscalYear,
    sales: v.sales ? l.sales : null,
    ebitda: v.ebitda ? l.ebitda : null,
    margin: v.margin ? margin : null,
    priceMin: v.price && !l.negotiable ? l.priceMin : null,
    priceMax: v.price && !l.negotiable ? l.priceMax : null,
    negotiable: v.price ? l.negotiable : false,
    hidden: { sales: !v.sales, ebitda: !v.ebitda, margin: !v.margin, price: !v.price },
    publishedAt: l.publishedAt?.toISOString() ?? null,
    hasTeaser,
    confidential: confidential
      ? {
          legalName: l.legalName,
          city: l.city,
          foundedYear: l.foundedYear,
          ownership: l.ownership,
          advisorName: l.advisorName,
          notes: l.confidentialNotes,
          history: parseJson(l.financialHistory, []),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Documentos

export type DocMode = "descarga" | "lectura" | "restringido" | "solicitado" | "rechazado" | "ninguno";

/** Nivel efectivo de acceso de un usuario a un documento. */
export function docMode(
  doc: ListingDocument,
  listing: Listing,
  ctx: ListingCtx,
  requestStatus?: string | null,
): DocMode {
  if (ctx.isAdmin || ctx.isTeam) return "descarga";
  if (doc.kind === "nda") {
    // El NDA del vendedor lo revisa y descarga quien ya solicitó información (para leerlo con su área legal).
    return ctx.engagement ? "descarga" : listing.status === "publicada" ? "lectura" : "ninguno";
  }
  if (doc.kind === "teaser") {
    // El teaser no confidencial se revisa junto con la publicación.
    return listing.status === "publicada" || ctx.engagement ? "lectura" : "ninguno";
  }
  if (!ctx.confidential) return "ninguno";
  if (doc.permission === "descarga") return "descarga";
  if (doc.permission === "lectura") return "lectura";
  if (requestStatus === "aprobado") return "lectura";
  if (requestStatus === "solicitado") return "solicitado";
  if (requestStatus === "rechazado") return "rechazado";
  return "restringido";
}

export const INLINE_VIEWABLE = ["application/pdf", "image/jpeg", "image/png"];

/** Nombre que ve el usuario. Antes de autorización nunca se expone el nombre original. */
export function displayName(doc: ListingDocument, listing: Listing, ctx: ListingCtx): string {
  if (doc.kind === "teaser") return `Teaser ${listing.code}.pdf`;
  if (doc.kind === "nda") return `NDA ${listing.code}.pdf`;
  return ctx.confidential ? doc.originalName : "Documento confidencial";
}
