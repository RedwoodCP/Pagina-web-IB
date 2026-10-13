import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canOpen, resolveDoc } from "@/lib/doc-access";
import { signFileLink } from "@/lib/files";

// Punto de entrada estable para la interfaz: verifica sesión y permiso y redirige a un
// enlace firmado de 5 minutos, atado al usuario. No existe una URL pública permanente.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/iniciar-sesion", req.url));
  const { id } = await params;
  const want = req.nextUrl.searchParams.get("modo") === "descargar" ? "descargar" : "ver";
  const r = await resolveDoc(id, user);
  if (!r) return new NextResponse("Documento no encontrado.", { status: 404 });
  if (!canOpen(r.mode, want)) {
    await audit(user.id, "document.denied", "document", id, { listingId: r.listing.id, meta: { want, mode: r.mode } });
    return new NextResponse("No tiene permiso para abrir este documento.", { status: 403 });
  }
  const res = NextResponse.redirect(new URL(signFileLink(id, user.id, want), req.url), 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
