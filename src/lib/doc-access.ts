import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { buildCtx, docMode, displayName, type DocMode } from "./access";

/** Resuelve documento + permiso efectivo del usuario. Null si no debe saber que existe. */
export async function resolveDoc(docId: string, user: CurrentUser) {
  const doc = await db.listingDocument.findUnique({
    where: { id: docId },
    include: { listing: { include: { collaborators: { select: { userId: true, role: true } }, exclusions: true } } },
  });
  if (!doc) return null;
  const l = doc.listing;
  const engagement = await db.engagement.findUnique({
    where: { listingId_userId: { listingId: l.id, userId: user.id } },
    include: { nda: true },
  });
  const ctx = buildCtx(user, l, engagement);
  const excluded = !!user.organizationId && l.exclusions.some((e) => e.organizationId === user.organizationId);
  if (excluded && !ctx.isTeam && !ctx.isAdmin) return null;
  const req = await db.documentAccessRequest.findUnique({ where: { documentId_userId: { documentId: doc.id, userId: user.id } } });
  const mode: DocMode = docMode(doc, l, ctx, req?.status);
  return { doc, listing: l, ctx, mode, name: displayName(doc, l, ctx) };
}

export function canOpen(mode: DocMode, want: "ver" | "descargar") {
  if (want === "descargar") return mode === "descarga";
  return mode === "descarga" || mode === "lectura";
}
