"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { setFlash } from "@/lib/flash";
import { loadListing } from "@/lib/access";
import { invalid, okEmail, str, type ActionState } from "@/lib/action";
import { INTEREST_LEVELS, NDA_VALIDITY_MONTHS } from "@/lib/domain";
import { ndaSource } from "@/lib/nda-source";
import { createHash } from "node:crypto";
import { deleteStored, storeFile, validateUpload } from "@/lib/files";
import { parseLocalDateTime } from "@/lib/format";
import { createEnvelope, signatureStatus } from "@/lib/signature";

async function teamIds(listingId: string) {
  const l = await db.listing.findUniqueOrThrow({ where: { id: listingId }, include: { collaborators: true } });
  return [l.ownerId, ...l.collaborators.filter((c) => c.role === "gestor").map((c) => c.userId)];
}

/** Carga la oportunidad y verifica que el usuario pueda actuar como comprador. */
async function buyerCtx(code: string) {
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r) return { error: "La oportunidad no existe o ya no está disponible." } as const;
  if (user.isAdmin) return { error: "El equipo de administración no puede participar como comprador." } as const;
  if (r.ctx.isTeam) return { error: "No puede solicitar información de una oportunidad que usted gestiona." } as const;
  if (!user.canBuy) return { error: "Su perfil no tiene habilitada la compra. Actívela en Mi perfil." } as const;
  return { user, ...r };
}

export async function toggleFavoriteAction(code: string): Promise<{ error?: string; message?: string }> {
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r) return { error: "La oportunidad no está disponible." };
  const key = { userId_listingId: { userId: user.id, listingId: r.listing.id } };
  const had = await db.favorite.findUnique({ where: key });
  if (had) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId: user.id, listingId: r.listing.id } });
  revalidatePath("/oportunidades");
  revalidatePath("/panel");
  return { message: had ? `${code} se quitó de favoritas.` : `${code} se guardó en favoritas.` };
}

/** Paso 1 del proceso: registrar interés. Crea la relación con NDA pendiente de firma. */
export async function requestInfoAction(code: string): Promise<{ error?: string } | void> {
  const c = await buyerCtx(code);
  if ("error" in c) return { error: c.error };
  if (c.listing.status !== "publicada") return { error: "La oportunidad ya no recibe nuevas solicitudes." };
  if (!c.ctx.engagement) {
    const e = await db.engagement.create({
      data: { listingId: c.listing.id, userId: c.user.id, organizationName: c.user.organization?.name ?? null },
    });
    await audit(c.user.id, "engagement.requested", "engagement", e.id, { listingId: c.listing.id });
    await notify(await teamIds(c.listing.id), `Nueva solicitud de información en ${code}.`, `/venta/${c.listing.id}`);
    await setFlash("Solicitud registrada. Revise y firme el NDA para continuar.");
  }
  redirect(`/oportunidades/${code}/nda`);
}

export async function signNdaAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await buyerCtx(code);
  if ("error" in c) return { error: c.error };
  const e = c.ctx.engagement;
  if (!e) return { error: "Primero solicite información de la oportunidad." };
  if (e.ndaStatus === "firmado") return { error: "El NDA de esta oportunidad ya está firmado." };

  const d = {
    signerName: str(fd, "signerName", 120),
    signerTitle: str(fd, "signerTitle", 120),
    signerOrg: str(fd, "signerOrg", 160),
    signerEmail: str(fd, "signerEmail", 200).toLowerCase(),
    representation: str(fd, "representation", 20),
    clientName: str(fd, "clientName", 160),
    typed: str(fd, "typedName", 120),
    mode: str(fd, "mode", 20) === "archivo" ? "archivo" : "registro",
  };
  const f: Record<string, string> = {};
  if (!fd.get("read")) f.read = "Confirme que leyó el acuerdo completo.";
  if (!d.signerName) f.signerName = "Ingrese el nombre del firmante.";
  if (!d.signerTitle) f.signerTitle = "Indique el cargo del firmante.";
  if (!d.signerOrg) f.signerOrg = "Indique la organización.";
  if (!okEmail(d.signerEmail)) f.signerEmail = "Ingrese un correo válido.";
  if (!["propia", "organizacion", "tercero"].includes(d.representation)) f.representation = "Indique en nombre de quién firma.";
  if (d.representation === "tercero" && !d.clientName) f.clientName = "Indique a quién representa (puede ser una descripción genérica).";
  const sig = signatureStatus();
  let signed: Awaited<ReturnType<typeof readSignedFile>> | null = null;
  if (sig.mode === "registro_interno") {
    if (d.mode === "archivo") {
      signed = await readSignedFile(fd);
      if ("error" in signed) f.signedFile = signed.error;
      if (!fd.get("consentFile")) f.consentFile = "Confirme que el archivo es el NDA firmado por el firmante indicado.";
    } else {
      if (d.typed.toLowerCase() !== d.signerName.toLowerCase()) f.typedName = `Escriba el nombre del firmante exactamente: ${d.signerName || "—"}.`;
      if (!fd.get("consent")) f.consent = "Debe confirmar que acepta el acuerdo con este registro.";
    }
  }
  if (Object.keys(f).length) return invalid(f, fd);

  const src = await ndaSource(c.listing.id, code);
  const text = src.text;
  const textHash = await src.hash();
  const meta = await requestMeta();
  if (sig.mode === "proveedor") {
    const env = await createEnvelope({ engagementId: e.id, signerName: d.signerName, signerEmail: d.signerEmail, ndaText: text });
    if (!env.ok) return { error: `No se pudo iniciar la firma electrónica: ${env.error}`, values: { ...d } };
    await db.ndaSignature.upsert({
      where: { engagementId: e.id },
      create: { engagementId: e.id, ndaVersion: src.version, textHash, ...pickSigner(d), method: "proveedor", provider: sig.provider, providerRef: env.providerRef, status: "pendiente", ...meta },
      update: { providerRef: env.providerRef, status: "pendiente" },
    });
    await audit(c.user.id, "nda.provider_started", "engagement", e.id, { listingId: c.listing.id });
    if (env.signUrl) redirect(env.signUrl);
    return { ok: true, message: "Le enviamos el NDA por correo para su firma electrónica." };
  }

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setMonth(validUntil.getMonth() + NDA_VALIDITY_MONTHS);
  const method = signed && !("error" in signed) ? "documento_firmado" : "registro_interno";
  const file = signed && !("error" in signed) ? await storeSigned(signed) : {};
  await db.$transaction([
    db.ndaSignature.upsert({
      where: { engagementId: e.id },
      create: { engagementId: e.id, ndaVersion: src.version, textHash, ...pickSigner(d), method, status: "completado", completedAt: now, validUntil, ...meta, ...file },
      update: { ...pickSigner(d), ndaVersion: src.version, textHash, method, status: "completado", completedAt: now, validUntil, ...meta, ...file },
    }),
    // Firmar NO concede acceso: solo deja la solicitud de acceso en «pendiente».
    db.engagement.update({
      where: { id: e.id },
      data: { ndaStatus: "firmado", accessStatus: e.accessStatus === "none" ? "pendiente" : e.accessStatus, representation: d.representation, clientName: d.representation === "tercero" ? d.clientName : null },
    }),
  ]);
  await audit(c.user.id, "nda.signed", "engagement", e.id, { listingId: c.listing.id, meta: { method, version: src.version, hash: textHash.slice(0, 16) } });
  await notify(
    await teamIds(c.listing.id),
    method === "documento_firmado" ? `${d.signerOrg} cargó el NDA firmado de ${code} y espera su decisión de acceso.` : `${d.signerOrg} aceptó el NDA de ${code} y espera su decisión de acceso.`,
    `/venta/${c.listing.id}`,
  );
  await setFlash(method === "documento_firmado" ? "NDA firmado cargado. Su solicitud de acceso está pendiente de autorización." : "NDA registrado. Su solicitud de acceso está pendiente de autorización.");
  redirect(`/oportunidades/${code}/nda`);
}

// ---------------------------------------------------------------------------
// NDA firmado cargado por el comprador

const SIGNED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

async function readSignedFile(fd: FormData): Promise<{ error: string } | { buf: Buffer; name: string; mime: string }> {
  const file = fd.get("signedFile");
  if (!(file instanceof File) || file.size === 0) return { error: "Adjunte el NDA firmado (PDF, JPG o PNG)." };
  const buf = Buffer.from(await file.arrayBuffer());
  const v = validateUpload(file.name, buf);
  if ("error" in v) return { error: v.error };
  if (!SIGNED_TYPES.includes(v.mime)) return { error: "El NDA firmado debe ser PDF, JPG o PNG." };
  return { buf, name: file.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180), mime: v.mime };
}

async function storeSigned(f: { buf: Buffer; name: string; mime: string }) {
  return {
    signedKey: await storeFile(f.buf),
    signedName: f.name,
    signedMime: f.mime,
    signedSize: f.buf.length,
    signedHash: createHash("sha256").update(f.buf).digest("hex"),
    signedAt: new Date(),
  };
}

/** Cargar o reemplazar el NDA firmado después de haber aceptado (mientras el acceso no esté autorizado). */
export async function uploadSignedNdaAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await buyerCtx(code);
  if ("error" in c) return { error: c.error };
  const e = c.ctx.engagement;
  if (!e || e.ndaStatus !== "firmado" || !e.nda) return { error: "Primero complete el paso del NDA." };
  if (e.accessStatus === "autorizado") return { error: "Su acceso ya fue autorizado; el NDA firmado no puede reemplazarse." };
  const signed = await readSignedFile(fd);
  if ("error" in signed) return { fields: { signedFile: signed.error } };
  const old = e.nda.signedKey;
  const file = await storeSigned(signed);
  await db.ndaSignature.update({ where: { id: e.nda.id }, data: { ...file, method: e.nda.method === "proveedor" ? "proveedor" : "documento_firmado" } });
  if (old) await deleteStored(old);
  await audit(c.user.id, "nda.signed_uploaded", "engagement", e.id, { listingId: c.listing.id, meta: { hash: file.signedHash.slice(0, 16) } });
  await notify(await teamIds(c.listing.id), `${e.organizationName ?? c.user.name} cargó el NDA firmado de ${code}.`, `/venta/${c.listing.id}`);
  revalidatePath(`/oportunidades/${code}/nda`);
  return { ok: true, message: "NDA firmado cargado. El vendedor ya puede revisarlo." };
}

function pickSigner(d: { signerName: string; signerTitle: string; signerOrg: string; signerEmail: string; representation: string }) {
  return { signerName: d.signerName, signerTitle: d.signerTitle, signerOrg: d.signerOrg, signerEmail: d.signerEmail, representation: d.representation };
}

/** Acciones dentro del espacio privado: solo con acceso autorizado. */
async function roomCtx(code: string) {
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r || !r.ctx.engagement || r.ctx.engagement.accessStatus !== "autorizado") {
    if (r) await audit(user.id, "access.denied", "listing", r.listing.id, { listingId: r.listing.id });
    return { error: "No tiene acceso autorizado a este espacio." } as const;
  }
  return { user, listing: r.listing, engagement: r.ctx.engagement };
}

export async function askQuestionAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await roomCtx(code);
  if ("error" in c) return { error: c.error };
  const body = str(fd, "body", 2000);
  if (body.length < 10) return invalid({ body: "Escriba una pregunta de al menos 10 caracteres." }, fd);
  const q = await db.question.create({ data: { listingId: c.listing.id, askerId: c.user.id, body } });
  await audit(c.user.id, "question.asked", "question", q.id, { listingId: c.listing.id });
  await notify(await teamIds(c.listing.id), `Nueva pregunta en ${code}.`, `/venta/${c.listing.id}?tab=preguntas`);
  revalidatePath(`/oportunidades/${code}/espacio`);
  return { ok: true, message: "Pregunta enviada al vendedor." };
}

export async function requestMeetingAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const c = await roomCtx(code);
  if ("error" in c) return { error: c.error };
  const slots = [str(fd, "slot1", 30), str(fd, "slot2", 30), str(fd, "slot3", 30)].filter(Boolean);
  const format = str(fd, "format", 20);
  const message = str(fd, "message", 1000);
  const f: Record<string, string> = {};
  if (!slots.length) f.slot1 = "Proponga al menos un horario.";
  const now = Date.now();
  const iso: string[] = [];
  slots.forEach((s, i) => {
    const t = parseLocalDateTime(s);
    if (!t) f["slot" + (i + 1)] = "Fecha no válida.";
    else if (t.getTime() < now) f["slot" + (i + 1)] = "Elija una fecha futura.";
    else iso.push(t.toISOString());
  });
  if (!["video", "presencial", "telefono"].includes(format)) f.format = "Seleccione el formato.";
  if (Object.keys(f).length) return invalid(f, fd);
  const open = await db.meetingRequest.count({ where: { engagementId: c.engagement.id, status: "solicitada" } });
  if (open) return { error: "Ya tiene una solicitud de reunión pendiente de respuesta." };
  const m = await db.meetingRequest.create({ data: { engagementId: c.engagement.id, slots: JSON.stringify(iso), format, message: message || null } });
  await audit(c.user.id, "meeting.requested", "meeting", m.id, { listingId: c.listing.id });
  await notify(await teamIds(c.listing.id), `Solicitud de reunión en ${code}.`, `/venta/${c.listing.id}?tab=reuniones`);
  revalidatePath(`/oportunidades/${code}/espacio`);
  return { ok: true, message: "Solicitud de reunión enviada. El vendedor confirmará un horario." };
}

export async function cancelMeetingAction(code: string, meetingId: string) {
  const c = await roomCtx(code);
  if ("error" in c) return { error: c.error };
  const m = await db.meetingRequest.findFirst({ where: { id: meetingId, engagementId: c.engagement.id, status: { in: ["solicitada", "confirmada"] } } });
  if (!m) return { error: "La reunión ya no puede cancelarse." };
  await db.meetingRequest.update({ where: { id: m.id }, data: { status: "cancelada" } });
  revalidatePath(`/oportunidades/${code}/espacio`);
  return { message: "Reunión cancelada." };
}

export async function setInterestAction(code: string, fd: FormData) {
  const c = await roomCtx(code);
  if ("error" in c) return { error: c.error };
  const level = str(fd, "level", 30);
  if (!INTEREST_LEVELS[level]) return { error: "Nivel no válido." };
  await db.engagement.update({ where: { id: c.engagement.id }, data: { interestLevel: level } });
  await audit(c.user.id, "interest.updated", "engagement", c.engagement.id, { listingId: c.listing.id, meta: { level } });
  revalidatePath(`/oportunidades/${code}/espacio`);
  return { message: `Interés actualizado: ${INTEREST_LEVELS[level]}.` };
}

export async function requestDocAccessAction(code: string, docId: string) {
  const c = await roomCtx(code);
  if ("error" in c) return { error: c.error };
  const doc = await db.listingDocument.findFirst({ where: { id: docId, listingId: c.listing.id, kind: "documento", permission: "restringido" } });
  if (!doc) return { error: "El documento no admite solicitudes." };
  const existing = await db.documentAccessRequest.findUnique({ where: { documentId_userId: { documentId: doc.id, userId: c.user.id } } });
  if (existing && existing.status !== "rechazado") return { message: "Ya solicitó este documento." };
  await db.documentAccessRequest.upsert({
    where: { documentId_userId: { documentId: doc.id, userId: c.user.id } },
    create: { documentId: doc.id, userId: c.user.id },
    update: { status: "solicitado", decidedAt: null },
  });
  await audit(c.user.id, "document.access_requested", "document", doc.id, { listingId: c.listing.id });
  await notify(await teamIds(c.listing.id), `Solicitud de documento restringido en ${code}.`, `/venta/${c.listing.id}?tab=documentos`);
  revalidatePath(`/oportunidades/${code}/espacio`);
  return { message: "Solicitud enviada al vendedor." };
}
