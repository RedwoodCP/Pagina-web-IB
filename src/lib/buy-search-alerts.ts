import "server-only";
import type { Listing } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { matchListing, matchPublic } from "./buy-search";
import { toPublicListing } from "./access";
import { notify, sendEmail } from "./notify";

/**
 * Al publicarse una oportunidad, avisa a administración (notificación y correo) si coincide
 * con búsquedas de compra activas, y al comprador dueño de una búsqueda si coincide con lo que él
 * puede ver. Devuelve los folios de las búsquedas que coinciden para administración.
 */
export async function alertBuySearchMatches(l: Listing): Promise<string[]> {
  if (l.isDemo && !env.showDemo) return [];
  const searches = await db.buySearch.findMany({ where: { status: "activa" } });
  await alertBuyers(l, searches.filter((b) => b.ownerId));
  const hits = searches.filter((b) => matchListing(b, l).ok);
  if (!hits.length) return [];
  const admins = await db.user.findMany({ where: { isAdmin: true, status: "activo" }, select: { id: true, email: true } });
  for (const b of hits) await notify(admins.map((a) => a.id), `${l.code} coincide con la búsqueda de compra ${b.code} (${b.clientName}).`, `/admin/busquedas/${b.id}`);
  const lines = hits.map((b) => `• ${b.code} · ${b.clientName}: ${env.appUrl}/admin/busquedas/${b.id}`).join("\n");
  const body = `Se publicó la oportunidad ${l.code} (${l.title ?? "sin título"}) y cumple los criterios obligatorios de ${hits.length === 1 ? "esta búsqueda de compra" : `estas ${hits.length} búsquedas de compra`}:\n\n${lines}\n\nRevise el detalle de cada búsqueda en la plataforma.`;
  for (const a of admins) await sendEmail(a.email, `Coincidencia para una búsqueda de compra: ${l.code}`, body);
  return hits.map((b) => b.code);
}

/**
 * Aviso al comprador: solo con datos que ve en el catálogo (nunca cifras confidenciales),
 * si la oportunidad es visible para él (no excluida, no propia) y su cuenta sigue activa.
 */
async function alertBuyers(l: Listing, searches: Awaited<ReturnType<typeof db.buySearch.findMany>>) {
  if (!searches.length) return;
  const pub = toPublicListing(l, false, false);
  const excluded = new Set((await db.listingExclusion.findMany({ where: { listingId: l.id }, select: { organizationId: true } })).map((e) => e.organizationId));
  const owners = await db.user.findMany({ where: { id: { in: searches.map((b) => b.ownerId!) }, status: "activo", canBuy: true } });
  for (const b of searches) {
    const u = owners.find((o) => o.id === b.ownerId);
    if (!u || u.id === l.ownerId || (u.organizationId && excluded.has(u.organizationId))) continue;
    if (!matchPublic(b, pub).ok) continue;
    await notify(u.id, `Nueva oportunidad para su búsqueda ${b.code}: ${l.code} · ${l.title ?? ""}`.trim(), `/oportunidades/${l.code}`);
    await sendEmail(
      u.email,
      `Nueva oportunidad para su búsqueda ${b.code}`,
      `Se publicó la oportunidad ${l.code} (${l.title ?? "sin título"}), que coincide con su búsqueda ${b.code}.\n\nVéala aquí: ${env.appUrl}/oportunidades/${l.code}\n\nLa identidad de la empresa se mantiene protegida hasta que el vendedor autorice su acceso.`,
    );
  }
}
