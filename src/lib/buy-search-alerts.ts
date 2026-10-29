import "server-only";
import type { Listing } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { matchListing } from "./buy-search";
import { notify, sendEmail } from "./notify";

/**
 * Al publicarse una oportunidad, avisa a administración (notificación y correo) si coincide
 * con búsquedas de compra activas. Devuelve los folios de las búsquedas que coinciden.
 */
export async function alertBuySearchMatches(l: Listing): Promise<string[]> {
  if (l.isDemo && !env.showDemo) return [];
  const searches = await db.buySearch.findMany({ where: { status: "activa" } });
  const hits = searches.filter((b) => matchListing(b, l).ok);
  if (!hits.length) return [];
  const admins = await db.user.findMany({ where: { isAdmin: true, status: "activo" }, select: { id: true, email: true } });
  for (const b of hits) await notify(admins.map((a) => a.id), `${l.code} coincide con la búsqueda de compra ${b.code} (${b.clientName}).`, `/admin/busquedas/${b.id}`);
  const lines = hits.map((b) => `• ${b.code} · ${b.clientName}: ${env.appUrl}/admin/busquedas/${b.id}`).join("\n");
  const body = `Se publicó la oportunidad ${l.code} (${l.title ?? "sin título"}) y cumple los criterios obligatorios de ${hits.length === 1 ? "esta búsqueda de compra" : `estas ${hits.length} búsquedas de compra`}:\n\n${lines}\n\nRevise el detalle de cada búsqueda en la plataforma.`;
  for (const a of admins) await sendEmail(a.email, `Coincidencia para una búsqueda de compra: ${l.code}`, body);
  return hits.map((b) => b.code);
}
