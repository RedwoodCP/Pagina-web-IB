"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setFlash } from "@/lib/flash";
import { adminIds, notify } from "@/lib/notify";
import { invalid, num, str, type ActionState } from "@/lib/action";
import { CURRENCIES, EMPLOYEE_RANGES, REGIONS, SECTORS } from "@/lib/domain";
import { INTL_OPS } from "@/lib/buy-search";

type R = { error?: string; message?: string };

async function nextCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = "BC-" + String(1000 + Math.floor(Math.random() * 9000));
    if (!(await db.buySearch.findUnique({ where: { code } }))) return code;
  }
  throw new Error("No se pudo generar un identificador.");
}

const pick = (fd: FormData, k: string, allowed: readonly string[]) => fd.getAll(k).map(String).filter((v) => allowed.includes(v));

/** Lee y valida el formulario. Devuelve los datos o los errores por campo. */
function parse(fd: FormData, clientOverride?: string) {
  const f: Record<string, string> = {};
  const clientName = clientOverride ?? str(fd, "clientName", 160);
  const currency = str(fd, "currency", 3);
  const salesMin = num(fd, "salesMin"), salesMax = num(fd, "salesMax");
  const marginMin = num(fd, "marginMin"), marginMax = num(fd, "marginMax");
  const debtEbitdaMax = num(fd, "debtEbitdaMax"), topClientMax = num(fd, "topClientMax");
  const regions = pick(fd, "regions", REGIONS);
  const sectors = pick(fd, "sectors", SECTORS);
  const employees = pick(fd, "employees", EMPLOYEE_RANGES);
  const intlOps = str(fd, "intlOps", 20);

  if (!clientName) f.clientName = "Indique para quién es la búsqueda (solo lo ve administración).";
  if (!CURRENCIES.includes(currency as never)) f.currency = "Seleccione la moneda.";
  if (Number.isNaN(salesMin) || Number.isNaN(salesMax) || (salesMin ?? 0) < 0 || (salesMax ?? 0) < 0) f.sales = "Use solo números positivos (millones).";
  else if (salesMin == null && salesMax == null) f.sales = "Indique ventas mínimas, máximas o ambas.";
  else if (salesMin != null && salesMax != null && salesMin > salesMax) f.sales = "El mínimo no puede ser mayor que el máximo.";
  if (Number.isNaN(marginMin) || Number.isNaN(marginMax)) f.margin = "Use solo números (porcentaje).";
  else if (marginMin == null && marginMax == null) f.margin = "Indique margen mínimo, máximo o ambos.";
  else if ([marginMin, marginMax].some((v) => v != null && (v < -100 || v > 100))) f.margin = "El margen debe estar entre -100% y 100%.";
  else if (marginMin != null && marginMax != null && marginMin > marginMax) f.margin = "El mínimo no puede ser mayor que el máximo.";
  if (!regions.length) f.regions = "Seleccione al menos una región.";
  if (!sectors.length) f.sectors = "Seleccione al menos una industria.";
  if (Number.isNaN(debtEbitdaMax) || (debtEbitdaMax != null && (debtEbitdaMax < 0 || debtEbitdaMax > 50))) f.debtEbitdaMax = "Ingrese un múltiplo entre 0 y 50 (veces).";
  if (Number.isNaN(topClientMax) || (topClientMax != null && (topClientMax <= 0 || topClientMax > 100))) f.topClientMax = "Ingrese un porcentaje entre 1 y 100.";

  return {
    f,
    data: {
      clientName,
      notes: str(fd, "notes", 2000) || null,
      currency,
      salesMin,
      salesMax,
      marginMin,
      marginMax,
      regions: JSON.stringify(regions),
      sectors: JSON.stringify(sectors),
      debtEbitdaMax,
      employees: JSON.stringify(employees),
      intlOps: INTL_OPS[intlOps] ? intlOps : "indistinto",
      topClientMax,
    },
  };
}

export async function createBuySearchAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const { f, data } = parse(fd);
  if (Object.keys(f).length) return invalid(f, fd);
  const b = await db.buySearch.create({ data: { ...data, code: await nextCode(), createdById: admin.id } });
  await audit(admin.id, "buysearch.created", "buysearch", b.id, { meta: { code: b.code } });
  await setFlash(`Búsqueda ${b.code} registrada.`);
  redirect(`/admin/busquedas/${b.id}`);
}

export async function updateBuySearchAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b) return { error: "La búsqueda no existe." };
  const { f, data } = parse(fd);
  if (Object.keys(f).length) return invalid(f, fd);
  await db.buySearch.update({ where: { id }, data });
  await audit(admin.id, "buysearch.updated", "buysearch", id, { meta: { code: b.code } });
  // La lista de coincidencias cambia: se recarga la página y el aviso viaja como «flash».
  await setFlash("Criterios actualizados.");
  redirect(`/admin/busquedas/${id}`);
}

export async function setBuySearchStatusAction(id: string, status: "activa" | "pausada" | "cerrada"): Promise<R> {
  const admin = await requireAdmin();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b) return { error: "La búsqueda no existe." };
  await db.buySearch.update({ where: { id }, data: { status } });
  await audit(admin.id, "buysearch.status", "buysearch", id, { meta: { code: b.code, status } });
  revalidatePath(`/admin/busquedas/${id}`);
  revalidatePath("/admin/busquedas");
  return { message: status === "activa" ? `${b.code} está activa.` : status === "pausada" ? `${b.code} quedó en pausa.` : `${b.code} se cerró.` };
}

export async function deleteBuySearchAction(id: string): Promise<R> {
  const admin = await requireAdmin();
  const b = await db.buySearch.findUnique({ where: { id } });
  if (!b) return { error: "La búsqueda no existe." };
  await db.buySearch.delete({ where: { id } });
  await audit(admin.id, "buysearch.deleted", "buysearch", id, { meta: { code: b.code } });
  await setFlash(`Búsqueda ${b.code} eliminada.`);
  redirect("/admin/busquedas");
}

// ---------------------------------------------------------------------------
// Búsquedas registradas por el propio comprador desde su perfil

async function buyer() {
  const user = await requireMember();
  if (user.isAdmin || !user.canBuy) redirect("/sin-permiso");
  return user;
}

async function ownSearch(id: string, userId: string) {
  const b = await db.buySearch.findUnique({ where: { id } });
  return b && b.ownerId === userId ? b : null;
}

export async function createMyBuySearchAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await buyer();
  if ((await db.buySearch.count({ where: { ownerId: user.id, status: { not: "cerrada" } } })) >= 10)
    return { error: "Puede tener hasta 10 búsquedas abiertas. Cierre alguna para registrar otra." };
  const { f, data } = parse(fd, user.organization?.name ?? user.name);
  if (Object.keys(f).length) return invalid(f, fd);
  const b = await db.buySearch.create({ data: { ...data, code: await nextCode(), createdById: user.id, ownerId: user.id } });
  await audit(user.id, "buysearch.created", "buysearch", b.id, { meta: { code: b.code, byBuyer: true } });
  await notify(await adminIds(), `${user.name} registró la búsqueda de compra ${b.code}.`, `/admin/busquedas/${b.id}`);
  await setFlash(`Búsqueda ${b.code} registrada. Le avisaremos cuando se publique una oportunidad que coincida.`);
  redirect(`/busquedas/${b.id}`);
}

export async function updateMyBuySearchAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await buyer();
  const b = await ownSearch(id, user.id);
  if (!b) return { error: "La búsqueda no existe." };
  const { f, data } = parse(fd, b.clientName);
  if (Object.keys(f).length) return invalid(f, fd);
  await db.buySearch.update({ where: { id }, data });
  await audit(user.id, "buysearch.updated", "buysearch", id, { meta: { code: b.code, byBuyer: true } });
  await setFlash("Criterios actualizados.");
  redirect(`/busquedas/${id}`);
}

export async function setMyBuySearchStatusAction(id: string, status: "activa" | "pausada" | "cerrada"): Promise<R> {
  const user = await buyer();
  const b = await ownSearch(id, user.id);
  if (!b) return { error: "La búsqueda no existe." };
  await db.buySearch.update({ where: { id }, data: { status } });
  await audit(user.id, "buysearch.status", "buysearch", id, { meta: { code: b.code, status, byBuyer: true } });
  revalidatePath(`/busquedas/${id}`);
  revalidatePath("/busquedas");
  return { message: status === "activa" ? `${b.code} está activa.` : status === "pausada" ? `${b.code} quedó en pausa: no recibirá avisos.` : `${b.code} se cerró.` };
}

export async function deleteMyBuySearchAction(id: string): Promise<R> {
  const user = await buyer();
  const b = await ownSearch(id, user.id);
  if (!b) return { error: "La búsqueda no existe." };
  await db.buySearch.delete({ where: { id } });
  await audit(user.id, "buysearch.deleted", "buysearch", id, { meta: { code: b.code, byBuyer: true } });
  await setFlash(`Búsqueda ${b.code} eliminada.`);
  redirect("/busquedas");
}
