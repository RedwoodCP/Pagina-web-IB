import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { loadListing } from "@/lib/access";
import { ACCESS_BADGE } from "@/lib/domain";
import { ndaSource } from "@/lib/nda-source";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ndaSections } from "@/lib/nda";
import { signatureStatus } from "@/lib/signature";
import { signNdaAction } from "@/app/actions/buyer";
import { Badge, Banner, Icon } from "@/components/ui";
import { Steps, processSteps } from "@/components/process";
import { NdaFlow } from "./nda-flow";

export const metadata: Metadata = { title: "Confidencialidad y NDA" };

export default async function NdaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r) notFound();
  const { listing: l, ctx } = r;
  if (ctx.isTeam || ctx.isAdmin) redirect(`/oportunidades/${code}`);
  const e = ctx.engagement;
  const sig = signatureStatus();
  const src = await ndaSource(l.id, code);

  return (
    <div className="page page-narrow">
      <Link prefetch={false} href={`/oportunidades/${code}`} className="back"><Icon name="arrow_back" />{code}</Link>
      <div className="eyebrow">Acuerdo de confidencialidad · {code} · {l.sector}</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 28px" }}>Confidencialidad y NDA</h1>

      {!e ? (
        <Banner tone="info">
          Primero solicite información desde la <Link prefetch={false} href={`/oportunidades/${code}`}>ficha de la oportunidad</Link>; después podrá revisar y firmar el NDA.
        </Banner>
      ) : e.ndaStatus === "pendiente_firma" ? (
        e.nda?.method === "proveedor" && e.nda.status === "pendiente" ? (
          <Banner tone="warn" icon="mark_email_unread">El NDA se envió a {e.nda.signerEmail} para su firma con {e.nda.provider}. Esta página se actualizará cuando el proveedor confirme la firma.</Banner>
        ) : (
          <NdaFlow
            code={code}
            sections={ndaSections(code)}
            version={src.version}
            doc={src.doc ? { view: `/api/documentos/${src.doc.id}/abrir?modo=ver`, download: `/api/documentos/${src.doc.id}/abrir?modo=descargar` } : null}
            defaults={{ name: user.name, title: user.title ?? "", org: user.organization?.name ?? "", email: user.email }}
            signature={{ mode: sig.mode, label: sig.label, configured: sig.configured }}
            action={signNdaAction.bind(null, code)}
          />
        )
      ) : (
        <div className="two-col">
          <div className="col-main stack gap-24">
            <div className="card card-pad">
              <div className="hstack between gap-12" style={{ flexWrap: "wrap" }}>
                <h2 className="h2">Estado de su solicitud</h2>
                <Badge b={ACCESS_BADGE[e.accessStatus]!} />
              </div>
              <p className="mt-12" style={{ lineHeight: 1.6 }}>
                {e.accessStatus === "pendiente" && "Su NDA quedó registrado. El vendedor o su asesor revisará su perfil y decidirá si autoriza el acceso. Le avisaremos por notificación."}
                {e.accessStatus === "autorizado" && "El vendedor autorizó su acceso. Ya puede abrir el espacio privado."}
                {e.accessStatus === "rechazado" && "El vendedor no autorizó el acceso a esta oportunidad."}
                {e.accessStatus === "revocado" && "El vendedor revocó el acceso. Los documentos ya no están disponibles."}
              </p>
              {e.accessNote && <p className="small c-lead mt-8">Nota: {e.accessNote}</p>}
              {e.accessStatus === "autorizado" && <Link prefetch={false} href={`/oportunidades/${code}/espacio`} className="btn mt-16"><Icon name="lock_open" />Abrir espacio privado</Link>}
            </div>
            {e.nda && (
              <div className="card">
                <div style={{ padding: "20px 20px 0" }}><h2 className="h2">Registro del NDA</h2></div>
                <dl className="kv mt-12">
                  <div><dt>Método</dt><dd>{e.nda.method === "registro_interno" ? "Aceptación registrada en la plataforma (no es firma electrónica avanzada)" : `Firma electrónica · ${e.nda.provider}`}</dd></div>
                  <div><dt>Firmante</dt><dd>{e.nda.signerName} · {e.nda.signerTitle}</dd></div>
                  <div><dt>Organización</dt><dd>{e.nda.signerOrg}{e.clientName ? ` · en representación de ${e.clientName}` : ""}</dd></div>
                  <div><dt>Fecha</dt><dd className="num">{fmtDateTime(e.nda.completedAt)}</dd></div>
                  <div><dt>Documento aceptado</dt><dd className="num">{e.nda.ndaVersion} · huella {e.nda.textHash.slice(0, 12)}…</dd></div>
                  <div><dt>Vigencia</dt><dd>Hasta el {fmtDate(e.nda.validUntil)} (se mantiene aunque se revoque el acceso)</dd></div>
                </dl>
              </div>
            )}
          </div>
          <aside className="col-side">
            <div className="card" style={{ padding: 24 }}>
              <div className="label-caps mb-16">Su proceso</div>
              <Steps steps={processSteps(ctx)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
