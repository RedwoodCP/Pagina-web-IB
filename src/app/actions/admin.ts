"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify, sendEmail } from "@/lib/notify";
import { env } from "@/lib/env";
import { newInvitationToken } from "@/lib/invitations";
import { invalid, okEmail, str, type ActionState } from "@/lib/action";
import { INVITATION_DAYS, PROFILES, invitationState } from "@/lib/domain";
import { fmtDate } from "@/lib/format";

type R = { error?: string; message?: string };
export type InviteResult = ActionState & { link?: string };

const profileFromInterest = (i: string) => (i === "vender" ? "vendedor" : i === "asesorar" ? "asesor" : i === "ambos" ? "ambos" : "comprador");

async function issueInvitation(adminId: string, email: string, profile: string, message: string | null, requestId?: string) {
  const t = newInvitationToken();
  const inv = await db.invitation.create({ data: { email, profile, message, tokenHash: t.tokenHash, expiresAt: t.expiresAt, invitedById: adminId, requestId } });
  const link = `${env.appUrl}/invitacion/${t.token}`;
  const sent = await sendEmail(
    email,
    "Invitación a la red privada de transacciones",
    `Recibió una invitación personal (${PROFILES[profile]}). Vigente hasta el ${fmtDate(t.expiresAt)}.\n\n${message ? message + "\n\n" : ""}Acepte la invitación aquí: ${link}\n\nEste enlace es personal y de un solo uso.`,
  );
  return { inv, link, sent: sent.sent };
}

export async function approveRequestAction(requestId: string, fd: FormData): Promise<R & { link?: string }> {
  const admin = await requireAdmin();
  const r = await db.membershipRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== "pendiente") return { error: "La solicitud ya fue resuelta." };
  if (await db.user.findUnique({ where: { email: r.email } })) return { error: "Ya existe una cuenta con ese correo." };
  const note = str(fd, "reason", 500) || null;
  await db.membershipRequest.update({ where: { id: r.id }, data: { status: "aprobada", reviewedAt: new Date(), reviewedById: admin.id, reviewNote: note } });
  const { inv, sent } = await issueInvitation(admin.id, r.email, profileFromInterest(r.interest), null, r.id);
  await audit(admin.id, "membership.approved", "membership", r.id, { meta: { email: r.email, invitation: inv.id } });
  revalidatePath("/admin/solicitudes");
  return { message: sent ? `Solicitud aprobada. Invitación enviada a ${r.email}.` : `Solicitud aprobada. Invitación creada para ${r.email}; sin proveedor de correo, copie el enlace en Admin › Correos.` };
}

export async function rejectRequestAction(requestId: string, fd: FormData): Promise<R> {
  const admin = await requireAdmin();
  const r = await db.membershipRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== "pendiente") return { error: "La solicitud ya fue resuelta." };
  const note = str(fd, "reason", 500) || null;
  await db.membershipRequest.update({ where: { id: r.id }, data: { status: "rechazada", reviewedAt: new Date(), reviewedById: admin.id, reviewNote: note } });
  await sendEmail(r.email, "Sobre su solicitud de acceso", "Gracias por su interés. En esta ocasión no fue posible aprobar su solicitud.");
  await audit(admin.id, "membership.rejected", "membership", r.id, { meta: { email: r.email, note } });
  revalidatePath("/admin/solicitudes");
  return { message: "Solicitud rechazada. Se notificó por correo." };
}

export async function sendInvitationAction(_: InviteResult, fd: FormData): Promise<InviteResult> {
  const admin = await requireAdmin();
  const email = str(fd, "email", 200).toLowerCase();
  const profile = str(fd, "profile", 20);
  const message = str(fd, "message", 1000) || null;
  const f: Record<string, string> = {};
  if (!okEmail(email)) f.email = "Ingrese un correo electrónico válido.";
  if (!PROFILES[profile]) f.profile = "Seleccione un perfil.";
  if (Object.keys(f).length) return invalid(f, fd);
  if (await db.user.findUnique({ where: { email } })) return invalid({ email: "Ya existe una cuenta con este correo." }, fd);
  const open = await db.invitation.findMany({ where: { email, status: "enviada" } });
  if (open.some((i) => invitationState(i) === "enviada")) return invalid({ email: "Ya existe una invitación vigente para este correo. Reenvíela o revóquela." }, fd);
  const { inv, link, sent } = await issueInvitation(admin.id, email, profile, message);
  await audit(admin.id, "invitation.sent", "invitation", inv.id, { meta: { email, profile } });
  revalidatePath("/admin/invitaciones");
  return {
    ok: true,
    message: sent ? `Invitación enviada a ${email}.` : `Invitación creada para ${email}. No hay proveedor de correo: comparta el enlace de forma segura.`,
    link: sent ? undefined : link,
  };
}

/** Reenviar = nuevo token y nueva vigencia; el enlace anterior deja de funcionar. */
export async function resendInvitationAction(id: string): Promise<R & { link?: string }> {
  const admin = await requireAdmin();
  const inv = await db.invitation.findUnique({ where: { id } });
  if (!inv) return { error: "Invitación no encontrada." };
  const st = invitationState(inv);
  if (st !== "enviada" && st !== "vencida") return { error: "Solo se pueden reenviar invitaciones vigentes o vencidas." };
  if (await db.user.findUnique({ where: { email: inv.email } })) return { error: "Ya existe una cuenta con este correo." };
  const t = newInvitationToken();
  await db.invitation.update({ where: { id }, data: { tokenHash: t.tokenHash, expiresAt: t.expiresAt, status: "enviada", createdAt: new Date() } });
  const link = `${env.appUrl}/invitacion/${t.token}`;
  const sent = await sendEmail(inv.email, "Invitación a la red privada de transacciones", `Le reenviamos su invitación, vigente ${INVITATION_DAYS} días: ${link}`);
  await audit(admin.id, "invitation.resent", "invitation", id, { meta: { email: inv.email } });
  revalidatePath("/admin/invitaciones");
  return { message: `Invitación reenviada. Nueva vigencia: ${fmtDate(t.expiresAt)}.${sent.sent ? "" : " Sin proveedor de correo: el enlace está en Admin › Correos."}` };
}

export async function revokeInvitationAction(id: string): Promise<R> {
  const admin = await requireAdmin();
  const inv = await db.invitation.findUnique({ where: { id } });
  if (!inv || inv.status !== "enviada") return { error: "Solo se pueden revocar invitaciones no aceptadas." };
  await db.invitation.update({ where: { id }, data: { status: "revocada", revokedAt: new Date() } });
  await audit(admin.id, "invitation.revoked", "invitation", id, { meta: { email: inv.email } });
  revalidatePath("/admin/invitaciones");
  return { message: "Invitación revocada. El enlace dejó de funcionar." };
}

export async function reviewListingAction(id: string, decision: "publicada" | "cambios", fd: FormData): Promise<R> {
  const admin = await requireAdmin();
  const l = await db.listing.findUnique({ where: { id } });
  if (!l || l.status !== "revision") return { error: "La publicación no está en revisión." };
  const note = str(fd, "reason", 1500);
  if (decision === "cambios" && !note) return { error: "Indique qué cambios necesita el vendedor." };
  await db.listing.update({ where: { id }, data: { status: decision, reviewNote: decision === "cambios" ? note : null, publishedAt: decision === "publicada" ? (l.publishedAt ?? new Date()) : l.publishedAt } });
  await audit(admin.id, decision === "publicada" ? "listing.published" : "listing.changes_requested", "listing", id, { listingId: id, meta: { note } });
  await notify(l.ownerId, decision === "publicada" ? `${l.code} fue aprobada y ya está en el catálogo.` : `El equipo solicitó cambios a ${l.code}: ${note}`, decision === "publicada" ? `/venta/${id}` : `/venta/${id}/editar?paso=1`);
  revalidatePath("/admin/publicaciones");
  return { message: decision === "publicada" ? `${l.code} aprobada y publicada en el catálogo.` : `Se solicitaron cambios para ${l.code}.` };
}

/** Intervención excepcional del administrador sobre un acceso. Siempre con motivo. */
export async function adminAccessAction(engagementId: string, decision: "autorizado" | "rechazado" | "revocado", fd: FormData): Promise<R> {
  const admin = await requireAdmin();
  const e = await db.engagement.findUnique({ where: { id: engagementId }, include: { listing: true } });
  if (!e) return { error: "Registro no encontrado." };
  if (e.ndaStatus !== "firmado") return { error: "Sin NDA firmado no puede autorizarse el acceso." };
  const reason = str(fd, "reason", 500);
  if (!reason) return { error: "Indique el motivo de la intervención." };
  await db.engagement.update({ where: { id: e.id }, data: { accessStatus: decision, accessNote: reason, accessDecidedAt: new Date(), accessDecidedById: admin.id } });
  await audit(admin.id, `access.${decision === "autorizado" ? "authorized" : decision === "rechazado" ? "rejected" : "revoked"}`, "engagement", e.id, { listingId: e.listingId, meta: { reason, byAdmin: true } });
  await notify(e.userId, `El equipo de administración actualizó su acceso a ${e.listing.code}.`, `/oportunidades/${e.listing.code}`);
  await notify(e.listing.ownerId, `Administración intervino en un acceso de ${e.listing.code}: ${reason}`, `/venta/${e.listingId}`);
  revalidatePath("/admin/accesos");
  return { message: "Acceso actualizado y registrado en la bitácora." };
}

export async function updateUserAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { error: "Usuario no encontrado." };
  const isAdmin = !!fd.get("isAdmin");
  if (u.id === admin.id && !isAdmin) return { error: "No puede quitarse a sí mismo el rol de administrador." };
  const data = { canBuy: !!fd.get("canBuy"), canSell: !!fd.get("canSell"), isAdvisor: !!fd.get("isAdvisor"), isAdmin };
  await db.user.update({ where: { id: userId }, data });
  await audit(admin.id, "user.updated", "user", userId, { meta: data });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: `Permisos de ${u.name} actualizados.` };
}

export async function setUserStatusAction(userId: string, status: "activo" | "suspendido", fd: FormData): Promise<R> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "No puede suspender su propia cuenta." };
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { error: "Usuario no encontrado." };
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === "suspendido") await db.session.deleteMany({ where: { userId } });
  await audit(admin.id, status === "suspendido" ? "user.suspended" : "user.reactivated", "user", userId, { meta: { reason: str(fd, "reason", 500) } });
  revalidatePath("/admin/usuarios");
  return { message: status === "suspendido" ? `${u.name} fue suspendido y sus sesiones se cerraron.` : `${u.name} fue reactivado.` };
}
