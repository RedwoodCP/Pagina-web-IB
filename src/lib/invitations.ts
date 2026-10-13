import "server-only";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { INVITATION_DAYS, invitationState } from "./domain";

/** Estado de una invitación a partir del token en claro (solo servidor). */
export async function lookupInvitation(token: string) {
  if (!token || token.length > 100) return { state: "invalida" as const };
  const inv = await db.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { invitedBy: { select: { name: true } } },
  });
  if (!inv) return { state: "invalida" as const };
  return { state: invitationState(inv) as "enviada" | "aceptada" | "vencida" | "revocada", inv };
}

/** Crea un token nuevo; el token en claro solo se devuelve una vez (para el enlace). */
export function newInvitationToken() {
  const token = randomToken(32);
  return { token, tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITATION_DAYS * 86400_000) };
}
