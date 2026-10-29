"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { adminIds, notify } from "@/lib/notify";
import { setFlash } from "@/lib/flash";
import { buildCtx } from "@/lib/access";
import { invalid, num, str, type ActionState } from "@/lib/action";
import { CURRENCIES, DEAL_TYPES, DOC_CATEGORIES, EMPLOYEE_RANGES, REGIONS, SECTORS } from "@/lib/domain";
import { deleteStored, storeFile, validateUpload } from "@/lib/files";
import { identityLeaks } from "@/lib/anonymity";

type R = { error?: string; message?: string };

/** Carga la publicación y exige permiso de gestión (dueño o colaborador gestor). */
async function manageCtx(id: string) {
  const user = await requireMember();
  const l = await db.listing.findUnique({ where: { id }, include: { collaborators: { select: { userId: true, role: true } } } });
  if (!l) return { error: "La publicación no existe." } as const;
  const ctx = buildCtx(user, l, null);
  if (!ctx.canManage) {
    await audit(user.id, "access.denied", "listing", l.id, { listingId: l.id, meta: { area: "gestion" } });
    return { error: "No tiene permiso para gestionar esta publicación." } as const;
  }
  return { user, l, ctx };
}

const editable = (s: string) => s === "borrador" || s === "cambios";

async function nextCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = "RW-" + String(1000 + Math.floor(Math.random() * 9000));
    if (!(await db.listing.findUnique({ where: { code } }))) return code;
  }
  throw new Error("No se pudo generar un identificador.");
}

export async function createListingAction() {
  const user = await requireMember();
  if (!user.canSell) {
    await setFlash("Active el perfil de venta en Mi perfil para publicar una empresa.");
    redirect("/perfil");
  }
  const l = await db.listing.create({
    data: { code: await nextCode(), ownerId: user.id, organizationId: user.organizationId, relationship: user.isAdvisor ? "asesor" : "propietario" },
  });
  await audit(user.id, "listing.created", "listing", l.id, { listingId: l.id });
  redirect(`/venta/${l.id}/editar?paso=1`);
}

/** Guarda un paso del asistente. intent=guardar solo valida formato; intent=continuar exige lo obligatorio. */
export async function saveStepAction(id: string, step: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (!editable(c.l.status)) return { error: "Solo puede editar borradores o publicaciones con cambios solicitados." };
  const strict = str(fd, "intent", 20) !== "guardar";
  const f: Record<string, string> = {};
  const data: Record<string, unknown> = {};

  if (step === 1) {
    const legalName = str(fd, "legalName", 200), sector = str(fd, "sector", 60), region = str(fd, "region", 40);
    const years = num(fd, "yearsOperating"), founded = num(fd, "foundedYear");
    if (strict && !legalName) f.legalName = "Requerido. Solo lo verán nuestro equipo y los compradores autorizados.";
    if (sector && !SECTORS.includes(sector as never)) f.sector = "Sector no válido.";
    if (strict && !sector) f.sector = "Seleccione un sector.";
    if (region && !REGIONS.includes(region as never)) f.region = "Región no válida.";
    if (strict && !region) f.region = "Seleccione una región.";
    if (Number.isNaN(years) || (years !== null && (years < 0 || years > 300))) f.yearsOperating = "Ingrese un número de años válido.";
    if (Number.isNaN(founded) || (founded !== null && (founded < 1800 || founded > new Date().getFullYear()))) f.foundedYear = "Año no válido.";
    const emp = str(fd, "employees", 20);
    Object.assign(data, {
      legalName: legalName || null, sector: sector || null, region: region || null, city: str(fd, "city", 120) || null,
      yearsOperating: years ?? null, foundedYear: founded ?? null, ownership: str(fd, "ownership", 200) || null,
      employees: EMPLOYEE_RANGES.includes(emp as never) ? emp : null,
      relationship: ["propietario", "directivo", "asesor"].includes(str(fd, "relationship")) ? str(fd, "relationship") : c.l.relationship,
      advisorName: str(fd, "advisorName", 160) || null,
    });
  }

  if (step === 2) {
    const dealType = str(fd, "dealType", 60), title = str(fd, "title", 140), summary = str(fd, "summary", 1200);
    const highlights = str(fd, "highlights", 1200).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
    const negotiable = !!fd.get("negotiable");
    const pmin = num(fd, "priceMin"), pmax = num(fd, "priceMax");
    const currency = str(fd, "currency", 3);
    if (dealType && !DEAL_TYPES.includes(dealType as never)) f.dealType = "Tipo no válido.";
    if (strict && !dealType) f.dealType = "Seleccione el tipo de operación.";
    if (strict && !title) f.title = "Escriba un título anónimo.";
    if (strict && summary.length < 40) f.summary = "Describa la empresa en al menos 40 caracteres, sin datos que la identifiquen.";
    const leak = identityLeaks(c.l.legalName, [title, summary, ...highlights]);
    if (leak) f[leak.field === 0 ? "title" : leak.field === 1 ? "summary" : "highlights"] = `No incluya datos que identifiquen a la empresa («${leak.word}»).`;
    if (!CURRENCIES.includes(currency as never)) f.currency = "Seleccione la moneda.";
    if (Number.isNaN(pmin) || Number.isNaN(pmax)) f.price = "Use solo números.";
    else if (!negotiable && strict && (pmin == null || pmax == null || pmin <= 0 || pmax < pmin)) f.price = "Indique un rango válido (mínimo ≤ máximo) o marque «A negociar».";
    Object.assign(data, { dealType: dealType || null, title: title || null, summary: summary || null, highlights: JSON.stringify(highlights), negotiable, priceMin: negotiable ? null : pmin, priceMax: negotiable ? null : pmax, currency: currency || "USD" });
  }

  if (step === 3) {
    const sales = num(fd, "sales"), ebitda = num(fd, "ebitda"), fy = num(fd, "fiscalYear");
    if (Number.isNaN(sales) || (sales !== null && sales <= 0)) f.sales = "Ingrese las ventas como número positivo (millones).";
    else if (strict && sales == null) f.sales = `Ingrese las ventas en millones de ${c.l.currency}.`;
    if (Number.isNaN(ebitda)) f.ebitda = "Ingrese el EBITDA como número (puede ser negativo).";
    else if (strict && ebitda == null) f.ebitda = `Ingrese el EBITDA en millones de ${c.l.currency}.`;
    else if (sales != null && ebitda != null && !Number.isNaN(sales) && ebitda > sales) f.ebitda = "El EBITDA no puede ser mayor que las ventas.";
    if (Number.isNaN(fy) || (fy !== null && (fy < 2000 || fy > new Date().getFullYear()))) f.fiscalYear = "Año fiscal no válido.";
    const history: { year: number; sales: number; ebitda: number }[] = [];
    for (const k of ["h1", "h2"]) {
      const y = num(fd, k + "y"), s = num(fd, k + "s"), e = num(fd, k + "e");
      if (y == null && s == null && e == null) continue;
      if (y == null || s == null || e == null || [y, s, e].some(Number.isNaN)) { f[k] = "Complete año, ventas y EBITDA, o deje la fila vacía."; continue; }
      history.push({ year: y, sales: s, ebitda: e });
    }
    if (fy && sales != null && ebitda != null && !Number.isNaN(sales) && !Number.isNaN(ebitda)) history.push({ year: fy, sales, ebitda });
    const debt = num(fd, "debtToEbitda"), topClient = num(fd, "topClientPct"), intl = str(fd, "intlOps", 2);
    if (Number.isNaN(debt) || (debt !== null && (debt < -20 || debt > 50))) f.debtToEbitda = "Ingrese un múltiplo válido (veces).";
    if (Number.isNaN(topClient) || (topClient !== null && (topClient < 0 || topClient > 100))) f.topClientPct = "Ingrese un porcentaje entre 0 y 100.";
    Object.assign(data, { debtToEbitda: debt, topClientPct: topClient, intlOps: intl === "si" ? true : intl === "no" ? false : null });
    const vis = (k: string) => (str(fd, k) === "autorizados" ? "autorizados" : "miembros");
    Object.assign(data, { sales, ebitda, fiscalYear: fy, financialHistory: JSON.stringify(history.sort((a, b) => a.year - b.year)), visSales: vis("visSales"), visEbitda: vis("visEbitda"), visMargin: vis("visMargin"), visPrice: vis("visPrice"), confidentialNotes: str(fd, "confidentialNotes", 2000) || null });
  }

  if (Object.keys(f).length) return invalid(f, fd, strict ? "Revise los campos marcados." : "Corrija los campos marcados para guardar el borrador.");
  await db.listing.update({ where: { id }, data: { ...data, step: Math.max(c.l.step, strict ? step + 1 : step) } });
  await audit(c.user.id, "listing.updated", "listing", id, { listingId: id, meta: { step } });
  revalidatePath(`/venta/${id}/editar`);
  if (!strict) return { ok: true, message: "Borrador guardado." };
  redirect(`/venta/${id}/editar?paso=${step + 1}`);
}

export async function uploadDocumentAction(id: string, kind: "teaser" | "nda" | "documento", _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (kind !== "documento" && !editable(c.l.status))
    return { error: `${kind === "nda" ? "El NDA" : "El teaser"} solo se puede cambiar en borrador o con cambios solicitados, porque lo revisa el equipo.` };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { fields: { file: "Seleccione un archivo." } };
  const buf = Buffer.from(await file.arrayBuffer());
  const v = validateUpload(file.name, buf, kind !== "documento");
  if ("error" in v) return { fields: { file: v.error } };
  const category = str(fd, "category", 30);
  const permission = str(fd, "permission", 20);
  if (kind === "documento" && !DOC_CATEGORIES.includes(category as never)) return { fields: { category: "Seleccione una categoría." } };
  if (kind === "documento" && !["descarga", "lectura", "restringido"].includes(permission)) return { fields: { permission: "Seleccione el permiso." } };
  const key = await storeFile(buf);
  if (kind !== "documento") {
    const old = await db.listingDocument.findMany({ where: { listingId: id, kind } });
    for (const o of old) await deleteStored(o.storageKey);
    await db.listingDocument.deleteMany({ where: { listingId: id, kind } });
  }
  const name = file.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180);
  const doc = await db.listingDocument.create({
    data: { listingId: id, kind, originalName: name, storageKey: key, mime: v.mime, size: buf.length, category: kind === "documento" ? category : kind === "nda" ? "Legal" : "Comercial", permission: kind === "documento" ? permission : "lectura", uploadedById: c.user.id },
  });
  await audit(c.user.id, "document.uploaded", "document", doc.id, { listingId: id, meta: { kind } });
  revalidatePath(`/venta/${id}`);
  revalidatePath(`/venta/${id}/editar`);
  return { ok: true, message: kind === "teaser" ? "Teaser cargado." : kind === "nda" ? "NDA cargado." : `«${name}» cargado.` };
}

export async function updateDocumentAction(id: string, docId: string, fd: FormData): Promise<R> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  const doc = await db.listingDocument.findFirst({ where: { id: docId, listingId: id, kind: "documento" } });
  if (!doc) return { error: "Documento no encontrado." };
  const category = str(fd, "category", 30), permission = str(fd, "permission", 20);
  if (!DOC_CATEGORIES.includes(category as never) || !["descarga", "lectura", "restringido"].includes(permission)) return { error: "Valores no válidos." };
  await db.listingDocument.update({ where: { id: docId }, data: { category, permission } });
  await audit(c.user.id, "document.updated", "document", docId, { listingId: id, meta: { category, permission } });
  revalidatePath(`/venta/${id}`);
  revalidatePath(`/venta/${id}/editar`);
  return { message: "Permiso del documento actualizado." };
}

export async function deleteDocumentAction(id: string, docId: string): Promise<R> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  const doc = await db.listingDocument.findFirst({ where: { id: docId, listingId: id } });
  if (!doc) return { error: "Documento no encontrado." };
  if (doc.kind !== "documento" && !editable(c.l.status)) return { error: `No puede quitar ${doc.kind === "nda" ? "el NDA" : "el teaser"} de una publicación aprobada.` };
  await db.listingDocument.delete({ where: { id: docId } });
  await deleteStored(doc.storageKey);
  await audit(c.user.id, "document.deleted", "document", docId, { listingId: id, meta: { kind: doc.kind } });
  revalidatePath(`/venta/${id}`);
  revalidatePath(`/venta/${id}/editar`);
  return { message: "Documento eliminado." };
}

export async function submitListingAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (!editable(c.l.status)) return { error: "La publicación ya fue enviada." };
  if (!fd.get("confirm")) return { fields: { confirm: "Confirme que cuenta con autorización para compartir esta información." } };
  const l = c.l;
  const missing: string[] = [];
  if (!l.legalName || !l.sector || !l.region) missing.push("paso 1 (empresa)");
  if (!l.dealType || !l.title || !l.summary || (!l.negotiable && (l.priceMin == null || l.priceMax == null))) missing.push("paso 2 (operación)");
  if (l.sales == null || l.ebitda == null) missing.push("paso 3 (finanzas)");
  if (!(await db.listingDocument.count({ where: { listingId: id, kind: "nda" } }))) missing.push("paso 4 (NDA de la empresa)");
  if (missing.length) return { error: `Faltan datos obligatorios en: ${missing.join(", ")}.` };
  if (identityLeaks(l.legalName, [l.title, l.summary])) return { error: "El título o la descripción contienen datos que identifican a la empresa. Revise el paso 2." };
  await db.listing.update({ where: { id }, data: { status: "revision", submittedAt: new Date(), reviewNote: null, step: 6 } });
  await audit(c.user.id, "listing.submitted", "listing", id, { listingId: id });
  await notify(await adminIds(), `Nueva publicación para revisar: ${l.code}.`, `/admin/publicaciones/${id}`);
  await setFlash(`${l.code} se envió a revisión. Tiempo habitual: 2 a 3 días hábiles.`);
  redirect("/venta");
}

export async function withdrawListingAction(id: string): Promise<R> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (c.l.status !== "publicada" && c.l.status !== "revision") return { error: "Solo puede retirar publicaciones activas o en revisión." };
  await db.listing.update({ where: { id }, data: { status: c.l.status === "revision" ? "borrador" : "retirada" } });
  await audit(c.user.id, "listing.withdrawn", "listing", id, { listingId: id });
  revalidatePath("/venta");
  revalidatePath(`/venta/${id}`);
  return { message: c.l.status === "revision" ? "Envío cancelado. La publicación volvió a borrador." : "Publicación retirada del catálogo. Los accesos autorizados se mantienen hasta que los revoque." };
}

export async function reopenListingAction(id: string): Promise<R> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (c.l.status !== "retirada") return { error: "Solo las publicaciones retiradas pueden volver a borrador." };
  await db.listing.update({ where: { id }, data: { status: "borrador" } });
  await audit(c.user.id, "listing.updated", "listing", id, { listingId: id, meta: { reopen: true } });
  revalidatePath(`/venta/${id}`);
  return { message: "La publicación volvió a borrador. Edítela y envíela de nuevo a revisión." };
}

export async function deleteDraftAction(id: string): Promise<R> {
  const c = await manageCtx(id);
  if ("error" in c) return { error: c.error };
  if (c.l.status !== "borrador" || !c.ctx.isOwner) return { error: "Solo el dueño puede eliminar un borrador." };
  const engaged = await db.engagement.count({ where: { listingId: id } });
  if (engaged) return { error: "La publicación tiene interesados; retírela en lugar de eliminarla." };
  const docs = await db.listingDocument.findMany({ where: { listingId: id } });
  await db.listing.delete({ where: { id } });
  for (const d of docs) await deleteStored(d.storageKey);
  await audit(c.user.id, "listing.deleted", "listing", id, { meta: { code: c.l.code } });
  await setFlash(`Borrador ${c.l.code} eliminado.`);
  redirect("/venta");
}

// ---------------------------------------------------------------------------
// Decisiones sobre interesados

export async function decideAccessAction(listingId: string, engagementId: string, decision: "autorizado" | "rechazado" | "revocado", fd: FormData): Promise<R> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  const e = await db.engagement.findFirst({ where: { id: engagementId, listingId } });
  if (!e) return { error: "Interesado no encontrado." };
  if (e.ndaStatus !== "firmado") return { error: "El interesado aún no firma el NDA. No puede autorizarse el acceso antes." };
  const allowed: Record<string, string[]> = { autorizado: ["pendiente", "rechazado", "revocado"], rechazado: ["pendiente"], revocado: ["autorizado"] };
  if (!allowed[decision]!.includes(e.accessStatus)) return { error: "La acción no aplica al estado actual." };
  const note = str(fd, "reason", 500) || null;
  await db.engagement.update({ where: { id: e.id }, data: { accessStatus: decision, accessNote: note, accessDecidedAt: new Date(), accessDecidedById: c.user.id } });
  await audit(c.user.id, `access.${decision === "autorizado" ? "authorized" : decision === "rechazado" ? "rejected" : "revoked"}`, "engagement", e.id, { listingId, meta: { note } });
  const text = { autorizado: `Acceso autorizado a ${c.l.code}. Ya puede abrir el espacio privado.`, rechazado: `El vendedor de ${c.l.code} no autorizó el acceso.`, revocado: `Su acceso a ${c.l.code} fue revocado.` }[decision];
  await notify(e.userId, text, decision === "autorizado" ? `/oportunidades/${c.l.code}/espacio` : `/oportunidades/${c.l.code}`);
  revalidatePath(`/venta/${listingId}`);
  return { message: { autorizado: "Acceso autorizado.", rechazado: "Acceso rechazado.", revocado: "Acceso revocado. El NDA sigue vigente." }[decision] };
}

export async function decideDocRequestAction(listingId: string, requestId: string, approve: boolean): Promise<R> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  const r = await db.documentAccessRequest.findFirst({ where: { id: requestId, document: { listingId } }, include: { document: true } });
  if (!r) return { error: "Solicitud no encontrada." };
  await db.documentAccessRequest.update({ where: { id: r.id }, data: { status: approve ? "aprobado" : "rechazado", decidedAt: new Date() } });
  await audit(c.user.id, "document.access_decided", "document", r.documentId, { listingId, meta: { approve, userId: r.userId } });
  await notify(r.userId, approve ? `Se aprobó su acceso a un documento restringido de ${c.l.code}.` : `No se aprobó su solicitud de documento en ${c.l.code}.`, `/oportunidades/${c.l.code}/espacio?tab=documentos`);
  revalidatePath(`/venta/${listingId}`);
  return { message: approve ? "Documento compartido en modo lectura." : "Solicitud rechazada." };
}

export async function answerQuestionAction(listingId: string, questionId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  const q = await db.question.findFirst({ where: { id: questionId, listingId } });
  if (!q) return { error: "Pregunta no encontrada." };
  const answer = str(fd, "answer", 4000);
  if (answer.length < 2) return invalid({ answer: "Escriba la respuesta." }, fd);
  await db.question.update({ where: { id: q.id }, data: { answer, answeredById: c.user.id, answeredAt: new Date() } });
  await audit(c.user.id, "question.answered", "question", q.id, { listingId });
  await notify(q.askerId, `Respondieron su pregunta en ${c.l.code}.`, `/oportunidades/${c.l.code}/espacio?tab=preguntas`);
  // El formulario desaparece al responder: el aviso viaja como «flash».
  await setFlash("Respuesta enviada.");
  revalidatePath(`/venta/${listingId}`);
  return { ok: true };
}

export async function decideMeetingAction(listingId: string, meetingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  const m = await db.meetingRequest.findFirst({ where: { id: meetingId, engagement: { listingId } }, include: { engagement: true } });
  if (!m || m.status !== "solicitada") return { error: "La solicitud ya fue respondida." };
  const decision = str(fd, "decision", 20);
  const slot = str(fd, "slot", 40);
  const response = str(fd, "response", 1000);
  if (decision === "confirmada" && !slot) return invalid({ slot: "Elija el horario a confirmar." }, fd);
  if (decision !== "confirmada" && decision !== "rechazada") return { error: "Decisión no válida." };
  await db.meetingRequest.update({ where: { id: m.id }, data: { status: decision, confirmedSlot: decision === "confirmada" ? slot : null, response: response || null } });
  await audit(c.user.id, "meeting.decided", "meeting", m.id, { listingId, meta: { decision } });
  await notify(m.engagement.userId, decision === "confirmada" ? `Reunión confirmada para ${c.l.code}.` : `El vendedor de ${c.l.code} propone otra fecha para la reunión.`, `/oportunidades/${c.l.code}/espacio?tab=reunion`);
  await setFlash(decision === "confirmada" ? "Reunión confirmada." : "Respuesta enviada.");
  revalidatePath(`/venta/${listingId}`);
  return { ok: true };
}

export async function addCollaboratorAction(listingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  if (!c.ctx.isOwner) return { error: "Solo el dueño de la publicación puede agregar colaboradores." };
  const email = str(fd, "email", 200).toLowerCase();
  const role = str(fd, "role", 10) === "lector" ? "lector" : "gestor";
  const u = await db.user.findUnique({ where: { email } });
  if (!u || u.status !== "activo" || !(u.canSell || u.isAdvisor)) return invalid({ email: "No hay un miembro activo con perfil de venta o asesoría con ese correo." }, fd);
  if (u.id === c.l.ownerId) return invalid({ email: "Usted ya es el dueño." }, fd);
  await db.listingCollaborator.upsert({ where: { listingId_userId: { listingId, userId: u.id } }, create: { listingId, userId: u.id, role }, update: { role } });
  await audit(c.user.id, "listing.updated", "listing", listingId, { listingId, meta: { collaborator: u.email, role } });
  await notify(u.id, `Le agregaron como ${role} de la publicación ${c.l.code}.`, `/venta/${listingId}`);
  revalidatePath(`/venta/${listingId}`);
  return { ok: true, message: `${u.name} agregado como ${role}.` };
}

export async function removeCollaboratorAction(listingId: string, userId: string): Promise<R> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  if (!c.ctx.isOwner) return { error: "Solo el dueño puede quitar colaboradores." };
  await db.listingCollaborator.deleteMany({ where: { listingId, userId } });
  await audit(c.user.id, "listing.updated", "listing", listingId, { listingId, meta: { removedCollaborator: userId } });
  revalidatePath(`/venta/${listingId}`);
  return { message: "Colaborador eliminado." };
}

export async function addExclusionAction(listingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  const orgId = str(fd, "organizationId", 40);
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return invalid({ organizationId: "Seleccione una organización." }, fd);
  if (org.id === c.l.organizationId) return invalid({ organizationId: "No puede excluir a su propia organización." }, fd);
  await db.listingExclusion.upsert({ where: { listingId_organizationId: { listingId, organizationId: org.id } }, create: { listingId, organizationId: org.id }, update: {} });
  await audit(c.user.id, "listing.updated", "listing", listingId, { listingId, meta: { excluded: org.name } });
  revalidatePath(`/venta/${listingId}`);
  return { ok: true, message: `${org.name} ya no verá esta oportunidad.` };
}

export async function removeExclusionAction(listingId: string, orgId: string): Promise<R> {
  const c = await manageCtx(listingId);
  if ("error" in c) return { error: c.error };
  await db.listingExclusion.deleteMany({ where: { listingId, organizationId: orgId } });
  revalidatePath(`/venta/${listingId}`);
  return { message: "Exclusión eliminada." };
}

