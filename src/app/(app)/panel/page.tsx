import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalog, parseFilters } from "@/lib/catalog";
import { fmtDate, fmtMoney, fmtPct, parseJson, zoned } from "@/lib/format";
import { Badge, DemoFlag, Empty, Icon } from "@/components/ui";
import { FavButton, processBadge } from "@/components/opportunity";
import { ACCESS_BADGE, NDA_BADGE } from "@/lib/domain";

export const metadata: Metadata = { title: "Panel" };

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function Panel() {
  const user = await requireMember();
  if (user.isAdmin) redirect("/admin/solicitudes");
  if (!user.canBuy) redirect("/venta");
  const { items } = await getCatalog(user, parseFilters({}));
  const sectors = parseJson<string[]>(user.prefSectors, []);
  const regions = parseJson<string[]>(user.prefRegions, []);
  const relevant = items.filter((o) => !o.isOwn && (sectors.includes(o.sector ?? "") || regions.includes(o.region ?? "")));
  const saved = items.filter((o) => o.saved);
  const procs = await db.engagement.findMany({
    where: { userId: user.id },
    include: { listing: true, nda: { select: { method: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const toSign = procs.filter((p) => p.ndaStatus === "pendiente_firma").length;
  const recs = relevant.filter((o) => o.nda === "none").slice(0, 3);
  const activity = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 });
  const now = zoned(new Date());
  const hour = now.hour;
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const kpis = [
    { l: "Relevantes para su perfil", v: relevant.length, sub: [sectors.slice(0, 2).join(", "), regions.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || "Configure sus intereses", href: "/oportunidades" },
    { l: "Favoritas", v: saved.length, sub: "Oportunidades guardadas", href: "/oportunidades?favoritas=1" },
    { l: "Procesos activos", v: procs.length, sub: "Solicitudes de información", href: "#procesos" },
    { l: "NDA por firmar", v: toSign, sub: "Requieren su firma", href: "#procesos" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Panel del comprador · {DAYS[now.weekday]} {now.day} de {MONTHS[now.month]}</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>{hello}, {user.name.split(" ")[0]}.</h1>
          <p className="lead">Estas son sus oportunidades y procesos de confidencialidad en curso.</p>
        </div>
        <Link prefetch={false} href="/oportunidades" className="btn btn-lg"><Icon name="search" />Explorar catálogo</Link>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <Link prefetch={false} key={k.l} href={k.href}>
            <div className="label-caps">{k.l}</div>
            <div className="kv-big">{k.v}</div>
            <div className="small c-lead">{k.sub}</div>
          </Link>
        ))}
      </div>

      <section className="section" id="procesos">
        <h2 className="section-title">Solicitudes y acuerdos de confidencialidad</h2>
        {procs.length === 0 ? (
          <Empty icon="contract" title="Aún no tiene procesos abiertos" text="Cuando solicite información de una oportunidad, aquí verá el estado del NDA y de la autorización.">
            <Link prefetch={false} href="/oportunidades" className="btn">Ir al catálogo</Link>
          </Empty>
        ) : (
          <div className="card rows">
            {procs.map((p) => {
              const code = p.listing.code;
              const href = p.ndaStatus === "pendiente_firma" ? `/oportunidades/${code}/nda` : p.accessStatus === "autorizado" ? `/oportunidades/${code}/espacio` : `/oportunidades/${code}/nda`;
              const label = p.ndaStatus === "pendiente_firma" ? "Firmar NDA" : p.accessStatus === "autorizado" ? "Abrir espacio privado" : "Ver estado";
              return (
                <div key={p.id} className="row">
                  <div className="row-main">
                    <div className="small"><strong>{code}</strong> <span className="c-lead">· {p.listing.sector}</span></div>
                    <div style={{ fontSize: 16, marginTop: 2 }}>{p.listing.title}</div>
                  </div>
                  <div className="row-actions">
                    <Badge b={p.ndaStatus === "firmado" ? (p.nda?.method === "registro_interno" ? NDA_BADGE.aceptado! : NDA_BADGE.firmado!) : NDA_BADGE.pendiente_firma!} />
                    <Badge b={ACCESS_BADGE[p.accessStatus]!} />
                    <Link prefetch={false} href={href} className="btn btn-secondary btn-sm">{label}<Icon name="arrow_forward" /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="two-col section" style={{ alignItems: "flex-start" }}>
        <section className="col-main">
          <h2 className="section-title">Recomendadas para su perfil</h2>
          {recs.length === 0 ? (
            <Empty icon="tips_and_updates" title="Sin recomendaciones nuevas" text={sectors.length ? "No hay oportunidades nuevas en sus sectores o regiones." : "Configure sus sectores y regiones de interés para recibir recomendaciones."}>
              <Link prefetch={false} href="/perfil" className="btn btn-secondary">Editar intereses</Link>
            </Empty>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {recs.map((o) => (
                <div key={o.id} className="mini">
                  <div className="hstack between">
                    <span className="fw7 small">{o.code}</span>
                    <span className="hstack gap-8">{o.isDemo && <DemoFlag />}<FavButton code={o.code} saved={o.saved} /></span>
                  </div>
                  <div className="label-caps">{o.sector} · {o.region}</div>
                  <div className="fw6" style={{ fontSize: 17, lineHeight: 1.35 }}>{o.title}</div>
                  <div className="grid-2" style={{ gap: 12, borderTop: "1px solid rgba(26,26,26,.1)", paddingTop: 12, gridTemplateColumns: "1fr 1fr" }}>
                    <div><div className="label-caps">Ventas</div><div className="num mt-4">{o.sales == null ? "Confidencial" : fmtMoney(o.sales, o.currency)}</div></div>
                    <div><div className="label-caps">Margen EBITDA</div><div className="num mt-4">{o.margin == null ? "Confidencial" : fmtPct(o.margin)}</div></div>
                  </div>
                  <Link prefetch={false} href={`/oportunidades/${o.code}`} className="btn btn-secondary btn-block">Ver oportunidad</Link>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title mt-48">Favoritas</h2>
          {saved.length === 0 ? (
            <Empty icon="bookmark" title="Sin favoritas" text="Guarde oportunidades desde el catálogo para seguirlas aquí." />
          ) : (
            <div className="card rows">
              {saved.map((o) => {
                const pb = processBadge(o);
                return (
                  <div key={o.id} className="row">
                    <Link prefetch={false} href={`/oportunidades/${o.code}`} className="fw7 small" style={{ minWidth: 72 }}>{o.code}</Link>
                    <div className="row-main">{o.title}</div>
                    <span className="small c-lead num">{o.sales == null ? "Confidencial" : fmtMoney(o.sales, o.currency)} · {o.margin == null ? "—" : fmtPct(o.margin)}</span>
                    {pb && <Badge b={pb} />}
                    <FavButton code={o.code} saved />
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <aside style={{ flex: "0 1 360px", minWidth: 260 }}>
          <h2 className="section-title">Actividad reciente</h2>
          {activity.length === 0 ? (
            <p className="c-lead">Sin actividad todavía.</p>
          ) : (
            <ol className="timeline">
              {activity.map((a) => (
                <li key={a.id}>
                  {a.href ? <Link prefetch={false} href={a.href} style={{ textDecoration: "none" }}>{a.text}</Link> : a.text}
                  <div className="small c-lead mt-4">{fmtDate(a.createdAt, false)}</div>
                </li>
              ))}
            </ol>
          )}
          <Link prefetch={false} href="/notificaciones" className="small">Ver todas las notificaciones</Link>
        </aside>
      </div>
    </div>
  );
}
