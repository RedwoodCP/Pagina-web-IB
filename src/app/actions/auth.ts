"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  passwordProblem,
  verifyLogin,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { adminIds, notify, sendEmail } from "@/lib/notify";
import { randomToken, sha256, shortRef } from "@/lib/crypto";
import { env } from "@/lib/env";
import { setFlash } from "@/lib/flash";
import { invalid, okEmail, str, type ActionState } from "@/lib/action";
import { INTERESTS, ORG_TYPES } from "@/lib/domain";
import { lookupInvitation } from "@/lib/invitations";

function homeFor(u: { isAdmin: boolean; canBuy: boolean; onboardingDone: boolean }) {
  if (u.isAdmin) return "/admin/solicitudes";
  if (!u.onboardingDone) return "/perfil/configuracion";
  return u.canBuy ? "/panel" : "/venta";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const f: Record<string, string> = {};
  if (!okEmail(email)) f.email = "Ingrese un correo electrónico válido.";
  if (!password) f.password = "Ingrese su contraseña.";
  if (Object.keys(f).length) return invalid(f, fd, "Correo o contraseña incompletos. Revise los datos e intente de nuevo.");
  const r = await verifyLogin(email, password);
  if (!r.ok) {
    await audit(null, "auth.login_failed", "user", null, { meta: { email } });
    return { error: r.error, values: { email } };
  }
  await createSession(r.user.id);
  await audit(r.user.id, "auth.login", "user", r.user.id);
  const next = str(fd, "next", 300);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(r.user));
}

export async function logoutAction() {
  const u = await getCurrentUser();
  if (u) await audit(u.id, "auth.logout", "user", u.id);
  await destroySession();
  redirect("/iniciar-sesion");
}

export async function requestMembershipAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const d = {
    name: str(fd, "name", 120),
    email: str(fd, "email", 200).toLowerCase(),
    phone: str(fd, "phone", 40),
    organization: str(fd, "organization", 160),
    orgType: str(fd, "orgType", 40),
    interest: str(fd, "interest", 20),
    message: str(fd, "message", 1500),
  };
  const f: Record<string, string> = {};
  if (!d.name) f.name = "Ingrese su nombre completo.";
  if (!okEmail(d.email)) f.email = "Ingrese un correo electrónico válido.";
  if (!d.organization) f.organization = "Indique su organización.";
  if (!ORG_TYPES[d.orgType]) f.orgType = "Seleccione el tipo de organización.";
  if (!INTERESTS[d.interest]) f.interest = "Seleccione su interés principal.";
  if (!fd.get("privacy")) f.privacy = "Debe aceptar el aviso de privacidad.";
  if (Object.keys(f).length) return invalid(f, fd);

  // Respuesta idéntica exista o no la cuenta, para no revelar quién es miembro.
  const [existingUser, openReq] = await Promise.all([
    db.user.findUnique({ where: { email: d.email } }),
    db.membershipRequest.findFirst({ where: { email: d.email, status: "pendiente" } }),
  ]);
  let reference = openReq?.reference;
  if (!existingUser && !openReq) {
    const r = await db.membershipRequest.create({ data: { ...d, phone: d.phone || null, message: d.message || null, reference: shortRef("SOL", 5) } });
    reference = r.reference;
    await audit(null, "membership.requested", "membership", r.id, { meta: { email: d.email } });
    await notify(await adminIds(), `Nueva solicitud de membresía: ${d.name} (${d.organization})`, "/admin/solicitudes");
    await sendEmail(
      d.email,
      "Recibimos su solicitud de acceso",
      `Hola ${d.name},\n\nRecibimos su solicitud con folio ${r.reference}. Nuestro equipo la revisará en un plazo aproximado de 3 a 5 días hábiles.\n\nPuede consultar el estado en ${env.appUrl}/estado-solicitud`,
    );
  } else if (existingUser) {
    await sendEmail(d.email, "Su cuenta ya existe", `Ya existe una cuenta con este correo. Inicie sesión en ${env.appUrl}/iniciar-sesion o restablezca su contraseña.`);
  }
  redirect(`/solicitud-enviada${reference ? `?folio=${encodeURIComponent(reference)}` : ""}`);
}

export type StatusResult = ActionState & { status?: string; reference?: string; date?: string };

export async function checkRequestStatusAction(_: StatusResult, fd: FormData): Promise<StatusResult> {
  const email = str(fd, "email", 200).toLowerCase();
  const reference = str(fd, "reference", 20).toUpperCase();
  const f: Record<string, string> = {};
  if (!okEmail(email)) f.email = "Ingrese el correo con el que hizo la solicitud.";
  if (!/^SOL-[A-Z0-9]{5}$/.test(reference)) f.reference = "El folio tiene el formato SOL-XXXXX.";
  if (Object.keys(f).length) return invalid(f, fd);
  const r = await db.membershipRequest.findUnique({ where: { reference } });
  if (!r || r.email !== email)
    return { error: "No encontramos una solicitud con ese folio y correo.", values: { email, reference } };
  return { ok: true, status: r.status, reference: r.reference, date: r.createdAt.toISOString(), values: { email, reference } };
}

export async function acceptInvitationAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const look = await lookupInvitation(token);
  if (look.state !== "enviada") {
    await audit(null, "invitation.rejected_use", "invitation", look.state === "invalida" ? null : look.inv.id, { meta: { state: look.state } });
    return { error: "Esta invitación ya no es válida. Solicite una nueva a nuestro equipo." };
  }
  const inv = look.inv;
  const name = str(fd, "name", 120);
  const pass = String(fd.get("password") ?? "");
  const pass2 = String(fd.get("password2") ?? "");
  const f: Record<string, string> = {};
  if (!name) f.name = "Ingrese su nombre completo.";
  const pp = passwordProblem(pass);
  if (pp) f.password = pp;
  if (!pass2 || pass !== pass2) f.password2 = "Las contraseñas no coinciden.";
  if (!fd.get("terms")) f.terms = "Debe aceptar los términos de uso.";
  if (Object.keys(f).length) return invalid(f, fd);

  const exists = await db.user.findUnique({ where: { email: inv.email } });
  if (exists) return { error: "Ya existe una cuenta con este correo. Inicie sesión." };

  const req = inv.requestId ? await db.membershipRequest.findUnique({ where: { id: inv.requestId } }) : null;
  const p = inv.profile;
  const user = await db.$transaction(async (tx) => {
    const org = req
      ? await tx.organization.create({ data: { name: req.organization, type: req.orgType } })
      : null;
    const u = await tx.user.create({
      data: {
        email: inv.email,
        name,
        phone: req?.phone ?? null,
        passwordHash: await hashPassword(pass),
        canBuy: p === "comprador" || p === "ambos" || p === "asesor",
        canSell: p === "vendedor" || p === "ambos" || p === "asesor",
        isAdvisor: p === "asesor",
        organizationId: org?.id ?? null,
      },
    });
    // Cambio atómico de estado: si otra pestaña ya la usó, falla.
    const upd = await tx.invitation.updateMany({
      where: { id: inv.id, status: "enviada" },
      data: { status: "aceptada", acceptedAt: new Date() },
    });
    if (upd.count !== 1) throw new Error("La invitación ya fue utilizada.");
    return u;
  });
  await audit(user.id, "invitation.accepted", "invitation", inv.id);
  if (inv.invitedById) await notify(inv.invitedById, `${name} aceptó la invitación (${inv.email}).`, "/admin/invitaciones");
  await createSession(user.id);
  await setFlash("Invitación aceptada. Complete su perfil.");
  redirect("/perfil/configuracion");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 200).toLowerCase();
  if (!okEmail(email)) return invalid({ email: "Ingrese un correo electrónico válido." }, fd);
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "activo") {
    const token = randomToken(32);
    await db.passwordReset.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
    await sendEmail(email, "Restablecer contraseña", `Para crear una nueva contraseña abra este enlace (vigente 1 hora):\n${env.appUrl}/restablecer/${token}`);
  }
  return {
    ok: true,
    message: "Si el correo pertenece a una cuenta activa, enviaremos un enlace para restablecer la contraseña.",
  };
}

export async function resetPasswordAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const row = await db.passwordReset.findUnique({ where: { id: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date())
    return { error: "El enlace venció o ya fue utilizado. Solicite uno nuevo." };
  const pass = String(fd.get("password") ?? "");
  const pass2 = String(fd.get("password2") ?? "");
  const f: Record<string, string> = {};
  const pp = passwordProblem(pass);
  if (pp) f.password = pp;
  if (pass !== pass2) f.password2 = "Las contraseñas no coinciden.";
  if (Object.keys(f).length) return invalid(f, fd);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(pass), failedLogins: 0, lockedUntil: null } }),
    db.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  await audit(row.userId, "auth.password_reset", "user", row.userId);
  await setFlash("Contraseña actualizada. Inicie sesión.");
  redirect("/iniciar-sesion");
}
