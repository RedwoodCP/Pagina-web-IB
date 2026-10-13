import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { Icon } from "@/components/ui";

export default async function SolicitudEnviada({ searchParams }: { searchParams: Promise<{ folio?: string }> }) {
  const { folio } = await searchParams;
  const ok = folio && /^SOL-[A-Z0-9]{5}$/.test(folio);
  return (
    <>
      <LightHeader action={{ href: "/", label: "Volver al inicio" }} />
      <div className="wrap" style={{ maxWidth: 720, padding: "clamp(40px, 8vw, 112px) var(--px)" }}>
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok-fg)", border: "1px solid var(--ok-bd)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={28} />
        </span>
        <div className="eyebrow mt-24">Solicitud recibida</div>
        <h1 className="h1-lg" style={{ margin: "12px 0 16px" }}>Gracias. Revisaremos su solicitud.</h1>
        <p className="lead" style={{ fontSize: 17 }}>
          Si el correo no pertenece ya a una cuenta, nuestro equipo evaluará la solicitud y responderá en un plazo aproximado de 3 a 5 días
          hábiles. Si se aprueba, recibirá una invitación personal con vigencia de 14 días.
        </p>
        {ok && (
          <div className="card mt-32" style={{ padding: 24 }}>
            <div className="label-caps">Folio de seguimiento</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 300, marginTop: 8 }}>{folio}</div>
            <p className="small c-lead mt-8">Guárdelo: con este folio y su correo puede consultar el estado de la solicitud.</p>
          </div>
        )}
        <div className="wrap-gap mt-32" style={{ gap: 12 }}>
          <Link href="/estado-solicitud" className="btn btn-lg">Consultar estado</Link>
          <Link href="/" className="btn btn-secondary btn-lg">Volver al inicio</Link>
        </div>
      </div>
    </>
  );
}
