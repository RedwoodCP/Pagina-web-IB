"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setFlash } from "@/lib/flash";
import { adminIds, notify, sendEmail } from "@/lib/notify";
import { env } from "@/lib/env";
import { invalid, str, type ActionState } from "@/lib/action";
import { ORG_TYPES } from "@/lib/domain";
import { canSeeDemand, demandWhere } from "@/lib/buy-search";
import { deleteStored, storeFile, validateUpload } from "@/lib/files";
import { identityLeaks } from "@/lib/anonymity";

type R = { error?: string; message?: string };

/**
 * Guarda el perfil anónimo de una búsqueda y la envía a publicación.
 * Si la envía su comprador, queda en revisión de administración; si la envía administración, se publica.
 */
export async function savePublicationAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireMember();
  const b = await db.buySearch.findUnique({ where: { id }, include: { owner: { include: { organization: true } } } });
  const isOwner = !!b && b.ownerId === user.id && !user.isAdmin;
  if (!b || (!isOwner && !user.isAdmin)) return { error: "La búsqueda no existe." };
  if (b.status !== "activa") return { error: "Reactive la búsqueda para publicarla." };

  const title = str(fd, "title", 140), summary = str(fd, "summary", 1500), buyerType = str(fd, "buyerType", 30);
  const f: Record<string, string> = {};
  if (title.length < 10) f.title = "Escriba un título de al menos 10 caracteres (p. ej. «Family office busca empresa industrial en el Bajío»).";
  if (summary.length < 40) f.summary = "Describa lo que busca en al menos 40 caracteres.";
  if (!ORG_TYPES[buyerType]) f.buyerType = "Seleccione el tipo de comprador.";
  // El perfil es anónimo: no debe revelar la organización del comprador.
  const orgName = b.owner?.organization?.name ?? (b.ownerId ? b.owner?.name : b.clientName);
  const leak = identityLeaks(orgName, [title, summary]);
  if (leak) f[leak.field === 0 ? "title" : "summary"] = `No incluya datos que identifiquen al comprador («${leak.word}»).`;

  const file = fd.get("teaser");
  let teaser: { teaserKey: string; teaserName: string; teaserSize: number } | null = null;
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const v = validateUpload(file.name, buf, true);
    if ("error" in v) f.teaser = v.error.replace("El teaser", "El perfil del comprador");
    else if (!Object.keys(f).length) {
      try {
        teaser = { teaserKey: await storeFile(buf), teaserName: file.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180), teaserSize: buf.length };
      } catch (err) {
        console.error("No se pudo guardar el archivo:", err);
        return { error: "No se pudo guardar el archivo. Intente de nuevo en unos minutos." };
      }
    }
  }
  if (Object.keys(f).length) return invalid(f, fd);
  if (teaser && b.teaserKey) await deleteStored(b.teaserKey);

  const publication = isOwner ? "revision" : "publicada";
  await db.buySearch.update({
    where: { id },
    data: { title, summary, buyerType, ...(teaser ?? {}), publication, reviewNote: null, publishedAt: publication === "publicada" ? (b.publishedAt ?? new Date()) : b.publishedAt },
  });
  await audit(user.id, isOwner ? "buysearch.publication_submitted" : "buysearch.published", "buysearch", id, { meta: { code: b.code } });
  if (isOwner) {
    await notify(await adminIds(), `Perfil de comprador para revisar: ${b.code}.`, `/admin/busquedas/${id}`);
    await setFlash("Enviado a revisión. Nuestro equipo lo revisará antes de mostrarlo a los vendedores.");
    redirect(`/busquedas/${id}`);
  }
  await setFlash(`${b.code} es visible para vendedores y asesores.`);
  redirect(`/admin/busquedas/${id}`);
}

/** Deja de mostrar la búsqueda a vendedores (el comprador o administración). */
export async function withdrawPublicationAction(id: string): Promise<R> {
  const user = await requireMember();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b || (b.ownerId !== user.id && !user.isAdmin)) return { error: "La búsqueda no existe." };
  await db.buySearch.update({ where: { id }, data: { publication: "privada" } });
  await audit(user.id, "buysearch.publication_withdrawn", "buysearch", id, { meta: { code: b.code } });
  revalidatePath(`/busquedas/${id}`);
  revalidatePath(`/admin/busquedas/${id}`);
  return { message: "La búsqueda ya no es visible para vendedores." };
}

export async function removeBuyerTeaserAction(id: string): Promise<R> {
  const user = await requireMember();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b || (b.ownerId !== user.id && !user.isAdmin)) return { error: "La búsqueda no existe." };
  if (b.teaserKey) await deleteStored(b.teaserKey);
  await db.buySearch.update({ where: { id }, data: { teaserKey: null, teaserName: null, teaserSize: null } });
  await audit(user.id, "buysearch.teaser_removed", "buysearch", id, { meta: { code: b.code } });
  revalidatePath(`/busquedas/${id}`);
  revalidatePath(`/admin/busquedas/${id}`);
  return { message: "Archivo quitado." };
}

export async function reviewPublicationAction(id: string, decision: "publicada" | "rechazada", fd: FormData): Promise<R> {
  const admin = await requireAdmin();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b || b.publication !== "revision") return { error: "La búsqueda no está en revisión." };
  const note = str(fd, "reason", 1000);
  if (decision === "rechazada" && !note) return { error: "Indique qué cambios necesita el comprador." };
  await db.buySearch.update({ where: { id }, data: { publication: decision, reviewNote: decision === "rechazada" ? note : null, publishedAt: decision === "publicada" ? (b.publishedAt ?? new Date()) : b.publishedAt } });
  await audit(admin.id, decision === "publicada" ? "buysearch.published" : "buysearch.publication_rejected", "buysearch", id, { meta: { code: b.code, note } });
  if (b.ownerId)
    await notify(b.ownerId, decision === "publicada" ? `Su búsqueda ${b.code} ya es visible para vendedores y asesores.` : `El equipo solicitó cambios al perfil de ${b.code}: ${note}`, `/busquedas/${id}`);
  revalidatePath(`/admin/busquedas/${id}`);
  revalidatePath("/admin/busquedas");
  return { message: decision === "publicada" ? `${b.code} es visible para vendedores.` : "Se solicitaron cambios al comprador." };
}

/** Un vendedor o asesor propone una empresa a un comprador. Su identidad no se muestra al comprador. */
export async function respondToBuySearchAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireMember();
  if (!canSeeDemand(user) || user.isAdmin) return { error: "Solo vendedores y asesores pueden proponer empresas." };
  const b = await db.buySearch.findFirst({ where: { code, ...demandWhere(user.id) } });
  if (!b) return { error: "Esta búsqueda ya no está disponible." };
  const listingId = str(fd, "listingId", 40) || null;
  const message = str(fd, "message", 1500);
  const f: Record<string, string> = {};
  let listing = null;
  if (listingId) {
    listing = await db.listing.findFirst({
      where: { id: listingId, status: "publicada", OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id, role: "gestor" } } }] },
    });
    if (!listing) f.listingId = "Seleccione una de sus oportunidades publicadas.";
  }
  if (message.length < 20) f.message = "Escriba un mensaje de al menos 20 caracteres.";
  const leak = listing ? identityLeaks(listing.legalName, [message]) : null;
  if (leak) f.message = `No incluya datos que identifiquen a la empresa («${leak.word}»).`;
  if (Object.keys(f).length) return invalid(f, fd);
  if (await db.buySearchResponse.findFirst({ where: { buySearchId: b.id, responderId: user.id, listingId } }))
    return { error: listing ? `Ya propuso ${listing.code} para esta búsqueda.` : "Ya envió una propuesta sin oportunidad publicada para esta búsqueda." };

  const r = await db.buySearchResponse.create({ data: { buySearchId: b.id, responderId: user.id, listingId, message } });
  await audit(user.id, "buysearch.response", "buysearch", b.id, { listingId: listingId ?? undefined, meta: { code: b.code, response: r.id } });
  const what = listing ? `la oportunidad ${listing.code}` : "una empresa aún no publicada";
  await notify(await adminIds(), `Un vendedor propuso ${what} para la búsqueda ${b.code}.`, `/admin/busquedas/${b.id}`);
  if (b.ownerId) {
    await notify(b.ownerId, `Un vendedor propuso ${what} para su búsqueda ${b.code}.`, `/busquedas/${b.id}`);
    const owner = await db.user.findUnique({ where: { id: b.ownerId }, select: { email: true } });
    if (owner)
      await sendEmail(owner.email, `Propuesta para su búsqueda ${b.code}`, `Un vendedor de la red propuso ${what} para su búsqueda ${b.code}.\n\nVea la propuesta aquí: ${env.appUrl}/busquedas/${b.id}\n\nLa identidad de la empresa se mantiene protegida hasta que el vendedor autorice su acceso.`);
  }
  revalidatePath(`/compradores/${code}`);
  return { ok: true, message: "Propuesta enviada. El comprador y nuestro equipo la recibirán." };
}
