import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toPublicListing } from "@/lib/access";
import { identityLeaks } from "@/lib/anonymity";
import { DOC_PERM_BADGE, LISTING_BADGE, RELATIONSHIP } from "@/lib/domain";
import { fmtDate, fmtMoney, fmtPct, fmtSize } from "@/lib/format";
import { Badge, Banner, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { OpportunityCard } from "@/components/opportunity";
import { reviewListingAction } from "@/app/actions/admin";

export default async function Revisar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id }, include: { documents: true, owner: { include: { organization: true } } } });
  if (!l) notFound();
  const teaser = l.documents.find((d) => d.kind === "teaser");
  const pub = toPublicListing(l, false, !!teaser);
  const leak = identityLeaks(l.legalName, [l.title, l.summary, ...pub.highlights]);
  const margin = l.sales && l.ebitda != null ? (l.ebitda / l.sales) * 100 : null;
  return (
    <>
      <Link prefetch={false} href="/admin/publicaciones" className="back"><Icon name="arrow_back" />Publicaciones</Link>
      <div className="hstack between gap-16 mb-24" style={{ flexWrap: "wrap" }}>
        <div>
          <div className="h2">{l.code} · {l.legalName}</div>
          <div className="small c-lead mt-4">Enviada {fmtDate(l.submittedAt)} por {l.owner.name} ({l.owner.email}) · {RELATIONSHIP[l.relationship]}</div>
        </div>
        <div className="wrap-gap">
          <Badge b={LISTING_BADGE[l.status]!} />
          {l.status === "revision" && (
            <>
              <ActionButton action={reviewListingAction.bind(null, id, "publicada")} className="btn" confirm={{ title: `Aprobar y publicar ${l.code}`, body: "La oportunidad aparecerá en el catálogo de forma anónima para todos los miembros (salvo organizaciones excluidas)." }} confirmLabel="Aprobar y publicar">Aprobar y publicar</ActionButton>
              <ActionButton action={reviewListingAction.bind(null, id, "cambios")} className="btn btn-secondary" confirm={{ title: "Solicitar cambios", body: "El vendedor verá su comentario y podrá editar la publicación." }} confirmLabel="Solicitar cambios" reason reasonRequired reasonLabel="Cambios necesarios">Solicitar cambios</ActionButton>
            </>
          )}
        </div>
      </div>
      {leak && <div className="mb-16"><Banner tone="err">Posible dato identificable en el texto público: «{leak.word}». Revise título, descripción y puntos destacados.</Banner></div>}
      <div className="label-caps mb-8">Vista del catálogo (sin autorización)</div>
      <OpportunityCard o={{ ...pub, nda: "none", ndaMethod: null, access: "none", saved: false, isOwn: false }} isAdmin />
      <div className="two-col mt-32">
        <section className="col-main" style={{ flex: "1 1 420px" }}>
          <h2 className="section-title">Datos confidenciales</h2>
          <dl className="kv card">
            <div><dt>Razón social</dt><dd>{l.legalName ?? "—"}</dd></div>
            <div><dt>Ciudad</dt><dd>{l.city ?? "—"}</dd></div>
            <div><dt>Fundación</dt><dd>{l.foundedYear ?? "—"}</dd></div>
            <div><dt>Accionistas</dt><dd>{l.ownership ?? "—"}</dd></div>
            <div><dt>Cifras {l.fiscalYear}</dt><dd className="num">Ventas {fmtMoney(l.sales, l.currency)} · EBITDA {fmtMoney(l.ebitda, l.currency)} · Margen {fmtPct(margin)}</dd></div>
            <div><dt>Visibilidad</dt><dd className="small">Ventas: {l.visSales} · EBITDA: {l.visEbitda} · Margen: {l.visMargin} · Precio: {l.visPrice}</dd></div>
          </dl>
        </section>
        <section style={{ flex: "1 1 360px", minWidth: 0 }}>
          <h2 className="section-title">Archivos</h2>
          <div className="card rows">
            {l.documents.length === 0 && <div className="row c-lead">Sin archivos.</div>}
            {l.documents.map((d) => (
              <div key={d.id} className="row">
                <div className="row-main"><div>{d.kind === "teaser" ? "Teaser · " : ""}{d.originalName}</div><div className="small c-lead">{fmtSize(d.size)} · {d.kind === "teaser" ? "Visible para miembros: revise que no identifique a la empresa" : DOC_PERM_BADGE[d.permission]?.label}</div></div>
                <a className="btn btn-secondary btn-sm" href={`/api/documentos/${d.id}/abrir?modo=ver`} target="_blank" rel="noopener">Ver</a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
