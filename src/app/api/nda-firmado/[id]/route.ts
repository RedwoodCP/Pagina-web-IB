import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { buildCtx } from "@/lib/access";
import { readStored } from "@/lib/files";

// NDA firmado por un comprador. Solo lo ven ese comprador, el equipo de la oportunidad y administración.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/iniciar-sesion", req.url));
  const { id } = await params;
  const e = await db.engagement.findUnique({
    where: { id },
    include: { nda: true, listing: { include: { collaborators: { select: { userId: true, role: true } } } } },
  });
  const ctx = e ? buildCtx(user, e.listing, null) : null;
  const allowed = !!e && !!ctx && (e.userId === user.id || ctx.isTeam || ctx.isAdmin);
  if (!e || !allowed || !e.nda?.signedKey) {
    if (e) await audit(user.id, "document.denied", "nda_firmado", id, { listingId: e.listingId });
    return new NextResponse("Documento no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const buf = await readStored(e.nda.signedKey);
  await audit(user.id, "nda.signed_viewed", "engagement", e.id, { listingId: e.listingId });
  const ext = e.nda.signedMime === "application/pdf" ? "pdf" : e.nda.signedMime === "image/png" ? "png" : "jpg";
  const name = encodeURIComponent(`NDA firmado ${e.listing.code} - ${e.organizationName ?? e.nda.signerOrg}.${ext}`);
  const download = req.nextUrl.searchParams.get("descargar") === "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": e.nda.signedMime ?? "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
