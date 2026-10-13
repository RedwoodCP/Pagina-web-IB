import "server-only";
import { db } from "./db";
import { requestMeta } from "./auth";

/** Registra una acción relevante en la bitácora. Nunca guarde aquí contraseñas ni tokens. */
export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  extra?: { listingId?: string | null; meta?: Record<string, unknown> },
) {
  const { ip } = await requestMeta().catch(() => ({ ip: null }));
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId: entityId ?? null,
      listingId: extra?.listingId ?? null,
      meta: JSON.stringify(extra?.meta ?? {}),
      ip,
    },
  });
}

export const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Inició sesión",
  "auth.login_failed": "Intento de inicio de sesión fallido",
  "auth.logout": "Cerró sesión",
  "auth.password_reset": "Restableció su contraseña",
  "membership.requested": "Solicitó membresía",
  "membership.approved": "Aprobó una solicitud de membresía",
  "membership.rejected": "Rechazó una solicitud de membresía",
  "invitation.sent": "Envió una invitación",
  "invitation.resent": "Reenvió una invitación",
  "invitation.revoked": "Revocó una invitación",
  "invitation.accepted": "Aceptó una invitación",
  "invitation.rejected_use": "Intento de usar una invitación no válida",
  "user.updated": "Actualizó permisos de un usuario",
  "user.suspended": "Suspendió un usuario",
  "user.reactivated": "Reactivó un usuario",
  "profile.completed": "Completó su perfil",
  "profile.updated": "Actualizó su perfil",
  "listing.created": "Creó un borrador",
  "listing.updated": "Editó una publicación",
  "listing.submitted": "Envió una publicación a revisión",
  "listing.published": "Aprobó y publicó una oportunidad",
  "listing.changes_requested": "Solicitó cambios a una publicación",
  "listing.withdrawn": "Retiró una publicación",
  "listing.deleted": "Eliminó un borrador",
  "document.uploaded": "Cargó un documento",
  "document.deleted": "Eliminó un documento",
  "document.updated": "Cambió el permiso de un documento",
  "document.viewed": "Consultó un documento",
  "document.downloaded": "Descargó un documento",
  "document.denied": "Intento de acceso a documento sin permiso",
  "document.access_requested": "Solicitó acceso a un documento restringido",
  "document.access_decided": "Resolvió una solicitud de documento",
  "engagement.requested": "Solicitó información de una oportunidad",
  "nda.signed": "Firmó / aceptó el NDA",
  "nda.provider_started": "Inició firma con proveedor",
  "access.authorized": "Autorizó acceso",
  "access.rejected": "Rechazó acceso",
  "access.revoked": "Revocó acceso",
  "access.denied": "Intento de acceso sin autorización",
  "question.asked": "Envió una pregunta",
  "question.answered": "Respondió una pregunta",
  "meeting.requested": "Solicitó una reunión",
  "meeting.decided": "Respondió una solicitud de reunión",
  "interest.updated": "Actualizó su nivel de interés",
};
