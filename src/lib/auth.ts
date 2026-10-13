import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User, Organization } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";

export const SESSION_COOKIE = "rw_session";
const SESSION_HOURS = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
let dummyHash: string | undefined;

export type CurrentUser = User & { organization: Organization | null };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(pw) || !/\d/.test(pw)) return "Combine letras y números.";
  return null;
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") || "").split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent")?.slice(0, 300) || null,
  };
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const meta = await requestMeta();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, ...meta } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  c.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual, o null. Se memoiza por petición. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { include: { organization: true } } },
  });
  if (!s || s.expiresAt < new Date() || s.user.status !== "activo") return null;
  return s.user;
});

/** Exige sesión; si falta, redirige a iniciar sesión. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/iniciar-sesion");
  return u;
}

/** Exige sesión de miembro con perfil completo (no administrador puro). */
export async function requireMember(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.onboardingDone && !u.isAdmin) redirect("/perfil/configuracion");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.isAdmin) redirect("/sin-permiso");
  return u;
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const generic = "Correo o contraseña incorrectos.";
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    dummyHash ??= await bcrypt.hash("sin-usuario", 12);
    await bcrypt.compare(password, dummyHash); // mismo tiempo de respuesta exista o no la cuenta
    return { ok: false, error: generic };
  }
  if (user.lockedUntil && user.lockedUntil > new Date())
    return {
      ok: false,
      error: `Por seguridad, la cuenta está bloqueada temporalmente tras varios intentos fallidos. Intente de nuevo en ${LOCK_MINUTES} minutos.`,
    };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return { ok: false, error: generic };
  }
  if (user.status !== "activo")
    return { ok: false, error: "Su cuenta está suspendida. Escriba a nuestro equipo para más información." };
  await db.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, user };
}
