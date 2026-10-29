import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canSeeDemand } from "@/lib/buy-search";
import { preparePdf, readStored } from "@/lib/files";

// Perfil (teaser) del comprador. Lo ven su dueño, administración y, si está publicado, vendedores y asesores.
// Se sirve sin metadatos y sin el nombre original del archivo.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/iniciar-sesion", req.url));
  const { id } = await params;
  const b = await db.buySearch.findUnique({ where: { id } });
  const allowed =
    !!b && (b.ownerId === user.id || user.isAdmin || (canSeeDemand(user) && b.publication === "publicada" && b.status === "activa"));
  if (!b || !allowed || !b.teaserKey) {
    if (b) await audit(user.id, "document.denied", "perfil_comprador", id);
    return new NextResponse("Documento no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const buf = await preparePdf(await readStored(b.teaserKey));
  await audit(user.id, "buysearch.teaser_viewed", "buysearch", id, { meta: { code: b.code } });
  const name = encodeURIComponent(`Perfil del comprador ${b.code}.pdf`);
  const download = req.nextUrl.searchParams.get("descargar") === "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
