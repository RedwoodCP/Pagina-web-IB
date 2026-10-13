import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadListing, toPublicListing, type ListingCtx } from "@/lib/access";
import { ACCESS_BADGE, DEAL_TYPE_DESC, LISTING_BADGE } from "@/lib/domain";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { Badge, Banner, DemoFlag, Icon, Metric } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { FavButton, priceText } from "@/components/opportunity";
import { requestInfoAction } from "@/app/actions/buyer";
import { Steps, processSteps } from "@/components/process";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return { title: (await params).code };
}

const STATUS_TEXT: Record<string, [string, string]> = {
  none: ["Información protegida", "Para conocer la identidad de la empresa y sus documentos, solicite información y firme el acuerdo de confidencialidad."],
  pendiente_firma: ["Firma pendiente", "Su solicitud está registrada. Falta firmar el NDA para que el vendedor pueda evaluar su acceso."],
  pendiente: ["Acceso pendiente de autorización", "Ya firmó el NDA. El vendedor o su asesor revisa su perfil: firmar no concede acceso automático. Tiempo habitual: 2 a 5 días hábiles."],
  autorizado: ["Acceso autorizado", "Puede consultar la información ampliada y los documentos que el vendedor le compartió. Cada consulta queda registrada."],
  rechazado: ["Acceso no autorizado", "El vendedor no autorizó el acceso a esta oportunidad. Su NDA sigue vigente."],
  revocado: ["Acceso revocado", "El vendedor retiró el acceso. Los documentos ya no están disponibles y el NDA sigue vigente durante 24 meses."],
};

export default async function Detalle({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ vista?: string }> }) {
  const { code } = await params;
  const { vista } = await searchParams;
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r) notFound();
  const { listing: l, ctx } = r;
  const asBuyer = vista === "comprador" && (ctx.isTeam || ctx.isAdmin);
  const conf = ctx.confidential && !asBuyer;
  const teaser = await db.listingDocument.findFirst({ where: { listingId: l.id, kind: "teaser" }, select: { id: true } });
  const fav = await db.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: l.id } } });
  const p = toPublicListing(l, conf, !!teaser);
  const e = ctx.engagement;
  const sk = !e ? "none" : e.ndaStatus === "pendiente_firma" ? "pendiente_firma" : e.accessStatus;
  const [stTitle, stText] = STATUS_TEXT[sk] ?? STATUS_TEXT.none!;
  const price = priceText(p);
  const fy = p.fiscalYear ?? "";
  const buyerView = !ctx.isTeam && !ctx.isAdmin;

  return (
    <div className="page">
      <Link href={ctx.isTeam && !asBuyer ? `/venta/${l.id}` : "/oportunidades"} className="back">
        <Icon name="arrow_back" />
        {ctx.isTeam && !asBuyer ? "Gestión de la publicación" : "Catálogo"}
      </Link>
      {asBuyer && (
        <div className="mb-24">
          <Banner tone="info" icon="visibility">
            Vista previa como comprador sin autorización: así se ve su publicación en el catálogo. <Link href={`/oportunidades/${code}`}>Salir de la vista previa</Link>
          </Banner>
        </div>
      )}
      {l.status !== "publicada" && (ctx.isTeam || ctx.isAdmin) && (
        <div className="mb-24">
          <Banner tone="warn">Esta publicación está en estado «{LISTING_BADGE[l.status]?.label}». Los compradores aún no la ven en el catálogo.</Banner>
        </div>
      )}
      <div className="eyebrow">
        {p.code} · {p.sector} · {p.region}, {p.country}
      </div>
      <h1 className="h1-lg" style={{ margin: "14px 0 18px", maxWidth: 760, textWrap: "balance" }}>{p.title}</h1>
      <div className="wrap-gap mb-24">
        <span className="tag tag-outline" style={{ height: 30, fontSize: 14, color: "#1A1A1A" }}>{p.dealType}</span>
        {p.publishedAt && <span className="tag tag-outline" style={{ height: 30, fontSize: 14, color: "#1A1A1A" }}>Publicada el {fmtDate(p.publishedAt)}</span>}
        {conf ? (
          <span className="badge badge-ok" style={{ height: 30, fontSize: 13 }}><Icon name="visibility" />Identidad visible para usted</span>
        ) : (
          <span className="badge badge-dark" style={{ height: 30, fontSize: 13 }}><Icon name="visibility_off" />Identidad protegida</span>
        )}
        {p.isDemo && <DemoFlag />}
        {buyerView && <FavButton code={p.code} saved={!!fav} />}
      </div>

      <div className="two-col">
        <div className="col-main">
          <div className="metrics">
            <Metric label={`Ventas ${fy}`} value={fmtMoney(p.sales, p.currency)} hidden={p.hidden.sales} />
            <Metric label={`EBITDA ${fy}`} value={fmtMoney(p.ebitda, p.currency)} hidden={p.hidden.ebitda} />
            <Metric label="Margen EBITDA" value={fmtPct(p.margin)} hidden={p.hidden.margin} />
            <Metric label="Precio indicativo" value={price} hidden={price == null} />
            <Metric label="Antigüedad" value={p.yearsOperating ? `${p.yearsOperating} años` : "—"} />
            <Metric label="Colaboradores" value={p.employees ?? "—"} />
            <Metric label="Moneda" value={p.currency} />
            <Metric label="Ubicación" value={p.region ?? "—"} sub={conf && l.city ? l.city : "Región general"} />
          </div>
          <p className="small c-lead mt-12">
            Cifras declaradas por el vendedor, sin auditoría de la plataforma. EBITDA en {p.currency} (monto); el margen EBITDA es EBITDA ÷ ventas.
          </p>

          {conf && p.confidential && (
            <section className="section">
              <h2 className="section-title">Identidad de la empresa</h2>
              <dl className="kv card">
                <div><dt>Razón social</dt><dd>{p.confidential.legalName ?? "—"}</dd></div>
                <div><dt>Ciudad</dt><dd>{p.confidential.city ?? "—"}</dd></div>
              </dl>
              {buyerView && <Link href={`/oportunidades/${code}/espacio`} className="btn btn-secondary mt-16"><Icon name="lock_open" />Abrir espacio privado</Link>}
            </section>
          )}

          <section className="section">
            <h2 className="section-title">Resumen de la oportunidad</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6 }}>{p.summary}</p>
            {p.highlights.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
                {p.highlights.map((h) => (
                  <li key={h} className="hstack gap-12" style={{ padding: "14px 0", borderTop: "1px solid rgba(26,26,26,.1)", fontSize: 16 }}>
                    <Icon name="arrow_right_alt" size={18} />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2 className="section-title">Tipo de operación</h2>
            <div className="fw6" style={{ fontSize: 18 }}>{p.dealType}</div>
            <p className="mt-8" style={{ color: "#444" }}>{DEAL_TYPE_DESC[p.dealType ?? ""]}</p>
          </section>

          <section className="section">
            <h2 className="section-title">Teaser no confidencial</h2>
            {teaser ? (
              <div className="card row">
                <span style={{ width: 44, height: 44, background: "#F0F0F0", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="description" /></span>
                <div className="row-main">
                  <div className="fw6">Teaser {p.code}.pdf</div>
                  <div className="small c-lead">PDF · Sin datos identificables · Revisado por el equipo · Metadatos eliminados al abrirlo</div>
                </div>
                <a href={`/api/documentos/${teaser.id}/abrir?modo=ver`} target="_blank" rel="noopener" className="btn btn-secondary">
                  <Icon name="visibility" />Ver teaser
                </a>
              </div>
            ) : (
              <div className="card row c-lead"><Icon name="draft" />El vendedor aún no cargó un teaser para esta oportunidad.</div>
            )}
          </section>

          {!conf && (
            <section className="section">
              <h2 className="section-title">Información que requiere autorización</h2>
              <p className="c-lead mb-16" style={{ marginTop: -6 }}>
                No mostramos vistas previas de documentos confidenciales. Se habilitan cuando el vendedor autoriza su acceso, tras la firma del NDA.
              </p>
              <div className="card rows">
                {[
                  ["lock", "Nombre, logotipo y ubicación exacta", "Tras autorización"],
                  ["lock", "Estados financieros detallados y modelo", "Tras autorización"],
                  ["lock", "Memorándum de información confidencial", "Tras autorización"],
                  ["key", "Clientes, contratos y personal clave", "Por solicitud específica"],
                ].map(([i, t, s]) => (
                  <div key={t} className="row">
                    <Icon name={i!} />
                    <span className="grow">{t}</span>
                    <span className="small c-lead">{s}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="col-side">
          <div className="card" style={{ padding: 24 }}>
            {ctx.isTeam && !asBuyer ? (
              <>
                <div className="label-caps">Su publicación</div>
                <div className="h2 mt-8" style={{ fontSize: 20 }}>Usted gestiona esta oportunidad</div>
                <p className="small c-lead mt-8">Decida quién accede, responda preguntas y administre documentos desde el panel del vendedor.</p>
                <div className="stack gap-8 mt-24">
                  <Link href={`/venta/${l.id}`} className="btn btn-block">Gestionar interesados</Link>
                  <Link href={`/oportunidades/${code}?vista=comprador`} className="btn btn-secondary btn-block">Ver como comprador</Link>
                </div>
              </>
            ) : ctx.isAdmin ? (
              <>
                <div className="label-caps">Administración</div>
                <div className="h2 mt-8" style={{ fontSize: 20 }}>Vista de auditoría</div>
                <p className="small c-lead mt-8">El equipo puede revisar la publicación completa. Las decisiones de acceso corresponden al vendedor; el administrador solo interviene de forma excepcional.</p>
                <Link href={`/admin/accesos?op=${code}`} className="btn btn-secondary btn-block mt-24">Ver accesos de {code}</Link>
              </>
            ) : (
              <>
                <div className="label-caps">Su proceso</div>
                <div className="h2 mt-8" style={{ fontSize: 20 }}>{stTitle}</div>
                <p className="small mt-8" style={{ color: "#444", lineHeight: 1.6 }}>{stText}</p>
                {e?.accessNote && (e.accessStatus === "rechazado" || e.accessStatus === "revocado") && (
                  <p className="small c-lead mt-8">Nota del vendedor: {e.accessNote}</p>
                )}
                <div className="mt-24"><Steps steps={processSteps(ctx)} /></div>
                <div className="mt-24 stack gap-8">
                  {!e && user.canBuy && l.status === "publicada" && (
                    <ActionButton action={requestInfoAction.bind(null, code)} className="btn btn-lg btn-block" icon="mail">Solicitar información</ActionButton>
                  )}
                  {!e && !user.canBuy && <Banner tone="info">Active el perfil de compra en <Link href="/perfil">Mi perfil</Link> para solicitar información.</Banner>}
                  {e?.ndaStatus === "pendiente_firma" && <Link href={`/oportunidades/${code}/nda`} className="btn btn-lg btn-block"><Icon name="edit_document" />Revisar y firmar NDA</Link>}
                  {e?.ndaStatus === "firmado" && e.accessStatus === "autorizado" && <Link href={`/oportunidades/${code}/espacio`} className="btn btn-lg btn-block"><Icon name="lock_open" />Abrir espacio privado</Link>}
                  {e?.ndaStatus === "firmado" && e.accessStatus !== "autorizado" && (
                    <Link href={`/oportunidades/${code}/nda`} className="btn btn-secondary btn-block">Ver NDA y estado</Link>
                  )}
                  {e && e.accessStatus !== "none" && <div className="mt-8"><Badge b={ACCESS_BADGE[e.accessStatus]!} /></div>}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
