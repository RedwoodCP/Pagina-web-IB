import "server-only";
import { db } from "./db";
import { env } from "./env";

export async function notify(userIds: string | string[], text: string, href?: string) {
  const ids = Array.from(new Set(Array.isArray(userIds) ? userIds : [userIds]));
  if (!ids.length) return;
  await db.notification.createMany({ data: ids.map((userId) => ({ userId, text, href })) });
}

/** Administradores activos (para avisos de revisión). */
export async function adminIds(): Promise<string[]> {
  const a = await db.user.findMany({ where: { isAdmin: true, status: "activo" }, select: { id: true } });
  return a.map((x) => x.id);
}

/**
 * Correo transaccional. Sin proveedor configurado (EMAIL_PROVIDER=none) el mensaje
 * queda en la bandeja de salida con estado «sin_proveedor» y no se envía a nadie.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  const row = await db.emailOutbox.create({ data: { to, subject, body } });
  if (env.emailProvider === "none") {
    await db.emailOutbox.update({ where: { id: row.id }, data: { status: "sin_proveedor" } });
    return { sent: false as const, reason: "Sin proveedor de correo configurado" };
  }
  // Punto de integración: implemente aquí el envío con su proveedor (Postmark, SES, Resend…).
  await db.emailOutbox.update({
    where: { id: row.id },
    data: { status: "error", error: `Proveedor «${env.emailProvider}» sin implementar` },
  });
  return { sent: false as const, reason: "Proveedor de correo sin implementar" };
}
