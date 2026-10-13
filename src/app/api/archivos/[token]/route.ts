import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canOpen, resolveDoc } from "@/lib/doc-access";
import { INLINE_VIEWABLE } from "@/lib/access";
import { preparePdf, readStored, verifyFileLink } from "@/lib/files";
import { fmtDateTime } from "@/lib/format";

const deny = (msg: string, status = 403) =>
  new NextResponse(msg, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = verifyFileLink(token);
  if (!p) return deny("El enlace venció o no es válido. Vuelva a abrir el documento desde la plataforma.", 410);
  const user = await getCurrentUser();
  // El enlace solo funciona para la misma persona y con su sesión activa.
  if (!user || user.id !== p.u) return deny("Inicie sesión con la cuenta que abrió el documento.", 401);
  const r = await resolveDoc(p.d, user);
  // El permiso se vuelve a comprobar: una revocación posterior invalida el enlace.
  if (!r || !canOpen(r.mode, p.m)) {
    await audit(user.id, "document.denied", "document", p.d, { listingId: r?.listing.id, meta: { via: "enlace" } });
    return deny("Su permiso sobre este documento cambió. Ya no puede abrirlo.");
  }
  const { doc } = r;
  if (p.m === "ver" && !INLINE_VIEWABLE.includes(doc.mime))
    return deny("Este formato no puede mostrarse en el visor protegido. Solicite al vendedor permiso de descarga.", 415);

  let buf: Buffer = await readStored(doc.storageKey);
  if (doc.mime === "application/pdf") {
    // Marca de agua con identidad del lector en documentos confidenciales; el teaser solo se limpia de metadatos.
    const wm = doc.kind === "teaser" || r.ctx.isTeam ? undefined : `Confidencial · ${user.email} · ${user.organization?.name ?? ""} · ${fmtDateTime(new Date())}`;
    try {
      buf = await preparePdf(buf, wm);
    } catch {
      return deny("No fue posible preparar el documento protegido.", 500);
    }
  }
  await audit(user.id, p.m === "descargar" ? "document.downloaded" : "document.viewed", "document", doc.id, { listingId: r.listing.id });
  const filename = encodeURIComponent(r.name);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${p.m === "descargar" ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      // El visor PDF del navegador no funciona dentro de un documento con sandbox.
      ...(doc.mime === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox" }),
      "X-Robots-Tag": "noindex",
    },
  });
}
