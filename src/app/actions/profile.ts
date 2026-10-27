"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createSession, hashPassword, passwordProblem, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setFlash } from "@/lib/flash";
import { invalid, num, str, type ActionState } from "@/lib/action";
import { ORG_TYPES, REGIONS, SECTORS } from "@/lib/domain";

const pick = (fd: FormData, k: string, allowed: readonly string[]) =>
  fd.getAll(k).map(String).filter((v) => allowed.includes(v));

export async function onboardingStepAction(step: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireUser();
  const f: Record<string, string> = {};
  if (step === 1) {
    const name = str(fd, "name", 120), title = str(fd, "title", 120), phone = str(fd, "phone", 40);
    if (!name) f.name = "Ingrese su nombre.";
    if (!title) f.title = "Indique su cargo.";
    if (Object.keys(f).length) return invalid(f, fd);
    await db.user.update({ where: { id: u.id }, data: { name, title, phone: phone || null } });
  }
  if (step === 2) {
    const name = str(fd, "org", 160), type = str(fd, "orgType", 40), website = str(fd, "website", 200), country = str(fd, "country", 80);
    if (!name) f.org = "Indique su organización.";
    if (!ORG_TYPES[type]) f.orgType = "Seleccione el tipo de organización.";
    if (website && !/^https?:\/\/\S+\.\S+/.test(website)) f.website = "Use una dirección completa, por ejemplo https://ejemplo.com";
    if (Object.keys(f).length) return invalid(f, fd);
    // Personas de la misma organización comparten un solo registro (p. ej. exclusiones por organización).
    const current = u.organizationId ? await db.organization.findUnique({ where: { id: u.organizationId }, include: { _count: { select: { users: true } } } }) : null;
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    if (current && same(current.name, name)) {
      // Solo quien está solo en la organización puede editar sus datos generales.
      if (current._count.users <= 1) await db.organization.update({ where: { id: current.id }, data: { name, type, website: website || null, country: country || null } });
    } else {
      const existing = (await db.organization.findMany({ where: { isDemo: false } })).find((o) => same(o.name, name));
      const org = existing ?? (await db.organization.create({ data: { name, type, website: website || null, country: country || null } }));
      await db.user.update({ where: { id: u.id }, data: { organizationId: org.id } });
    }
  }
  // Paso 3: los perfiles los asigna administración (Admin › Usuarios); aquí solo se confirman.
  if (step === 4) {
    const sectors = pick(fd, "sectors", SECTORS), regions = pick(fd, "regions", REGIONS);
    const min = num(fd, "ticketMin"), max = num(fd, "ticketMax");
    if (u.canBuy && !sectors.length) f.sectors = "Seleccione al menos un sector.";
    if (Number.isNaN(min) || (min !== null && min < 0)) f.ticketMin = "Ingrese un número válido.";
    if (Number.isNaN(max) || (max !== null && max < 0)) f.ticketMax = "Ingrese un número válido.";
    if (!f.ticketMin && !f.ticketMax && min !== null && max !== null && min > max) f.ticketMax = "El máximo debe ser mayor o igual al mínimo.";
    if (Object.keys(f).length) return invalid(f, fd);
    await db.user.update({
      where: { id: u.id },
      data: { prefSectors: JSON.stringify(sectors), prefRegions: JSON.stringify(regions), ticketMin: min, ticketMax: max, onboardingDone: true },
    });
    await audit(u.id, u.onboardingDone ? "profile.updated" : "profile.completed", "user", u.id);
    await setFlash(u.onboardingDone ? "Perfil actualizado." : "Perfil configurado. Bienvenido a la red.");
    const fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    redirect(fresh.canBuy ? "/panel" : "/venta");
  }
  redirect(`/perfil/configuracion?paso=${step + 1}`);
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await requireUser();
  const current = String(fd.get("current") ?? "");
  const pass = String(fd.get("password") ?? "");
  const pass2 = String(fd.get("password2") ?? "");
  const f: Record<string, string> = {};
  if (!(await bcrypt.compare(current, u.passwordHash))) f.current = "La contraseña actual no es correcta.";
  const pp = passwordProblem(pass);
  if (pp) f.password = pp;
  if (pass !== pass2) f.password2 = "Las contraseñas no coinciden.";
  if (Object.keys(f).length) return { error: "Revise los campos marcados.", fields: f };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pass) } });
  // Cierra las demás sesiones; la actual se renueva.
  await db.session.deleteMany({ where: { userId: u.id } });
  await createSession(u.id);
  await audit(u.id, "auth.password_reset", "user", u.id, { meta: { via: "perfil" } });
  return { ok: true, message: "Contraseña actualizada. Se cerraron sus otras sesiones." };
}

export async function markNotificationsReadAction() {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return { message: "Notificaciones marcadas como leídas." };
}
