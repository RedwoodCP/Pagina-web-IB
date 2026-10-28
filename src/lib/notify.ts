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
 * Correo transaccional. Proveedores:
 *  - none: el mensaje queda en la bandeja de salida (Admin › Correos) con estado «sin_proveedor».
 *  - resend: se envía con Resend (https://resend.com). Requiere EMAIL_API_KEY y EMAIL_FROM con
 *    un dominio verificado en Resend (registros DNS SPF/DKIM).
 * Todo envío queda registrado en la bandeja de salida con su estado.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  const row = await db.emailOutbox.create({ data: { to, subject, body } });
  const provider = env.emailProvider;
  if (provider === "none") {
    await db.emailOutbox.update({ where: { id: row.id }, data: { status: "sin_proveedor" } });
    return { sent: false as const, reason: "Sin proveedor de correo configurado" };
  }
  try {
    if (provider !== "resend") throw new Error(`Proveedor «${provider}» no soportado. Use EMAIL_PROVIDER=resend.`);
    const key = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) throw new Error("Faltan EMAIL_API_KEY o EMAIL_FROM.");
    const r = await fetch(process.env.EMAIL_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text: body, html: emailHtml(subject, body), reply_to: process.env.EMAIL_REPLY_TO || undefined }),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
    await db.emailOutbox.update({ where: { id: row.id }, data: { status: "enviado", sentAt: new Date() } });
    return { sent: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.emailOutbox.update({ where: { id: row.id }, data: { status: "error", error: msg.slice(0, 500) } });
    console.error("Correo no enviado:", msg);
    return { sent: false as const, reason: msg };
  }
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Versión HTML sobria con la identidad de Redwood (los enlaces se vuelven botones). */
function emailHtml(subject: string, body: string) {
  const logo = `${env.appUrl}/brand/redwood-logo.png`;
  const paragraphs = esc(body)
    .split(/\n{2,}/)
    .map((p) => {
      const link = p.match(/https?:\/\/\S+/);
      const text = p.replace(/https?:\/\/\S+/g, "").replace(/\n/g, "<br>").trim();
      const button = link
        ? `<p style="margin:20px 0"><a href="${link[0]}" style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;padding:12px 22px;font-weight:600;border-radius:2px">Abrir enlace</a></p><p style="font-size:12px;color:#808080;word-break:break-all;margin:0 0 16px">${link[0]}</p>`
        : "";
      return (text ? `<p style="margin:0 0 14px">${text}</p>` : "") + button;
    })
    .join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#FAFAFA;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid rgba(26,26,26,.1)">
<tr><td style="padding:28px 32px 8px"><img src="${logo}" alt="Redwood Capital Partners" height="30" style="display:block;height:30px;width:auto"></td></tr>
<tr><td style="padding:16px 32px 8px"><h1 style="font-size:22px;font-weight:400;margin:0 0 16px">${esc(subject)}</h1><div style="font-size:15px;line-height:1.6;color:#444444">${paragraphs}</div></td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid rgba(26,26,26,.08);font-size:12px;color:#808080">Red privada de transacciones · Mensaje automático, no responda a este correo si no lo esperaba.</td></tr>
</table></td></tr></table></body></html>`;
}
