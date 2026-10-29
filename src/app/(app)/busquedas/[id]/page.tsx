import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalog, parseFilters } from "@/lib/catalog";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { BUY_SEARCH_BADGE, INTL_OPS, criteria, matchPublic, rangeText, type Check } from "@/lib/buy-search";
import { Badge, DemoFlag, Empty, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { BuySearchForm } from "@/components/buy-search-form";
import { BuyPublication } from "@/components/buy-publication";
import { BuyResponses } from "@/components/buy-responses";
import { deleteMyBuySearchAction, setMyBuySearchStatusAction, updateMyBuySearchAction } from "@/app/actions/buy-search";

export const metadata: Metadata = { title: "Mi búsqueda" };

const ICON = { si: ["check_circle", "c-ok"], no: ["cancel", "c-err"], sin_dato: ["lock", "c-lead"] } as const;

function Checks({ items }: { items: Check[] }) {
  return (
    <div className="wrap-gap small" style={{ gap: 14 }}>
      {items.map((c) => (
        <span key={c.label} className="hstack gap-4">
          <span aria-hidden="true" className={"ms " + ICON[c.result][1]} style={{ fontSize: 16 }}>{ICON[c.result][0]}</span>
          <span><strong>{c.label}:</strong> {c.detail}</span>
        </span>
      ))}
    </div>
  );
}

export default async function MiBusqueda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  if (user.isAdmin) redirect(`/admin/busquedas/${id}`);
  const b = await db.buySearch.findUnique({ where: { id } });
  // Solo el dueño la ve; para cualquier otro, no existe.
  if (!b || b.ownerId !== user.id) notFound();
  const c = criteria(b);
  const [{ items }, responses] = await Promise.all([
    getCatalog(user, parseFilters({})),
    db.buySearchResponse.findMany({ where: { buySearchId: id }, include: { listing: { select: { code: true, title: true } }, responder: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const evaluated = items.filter((o) => !o.isOwn).map((o) => ({ o, m: matchPublic(b, o) }));
  const matches = evaluated.filter((x) => x.m.ok).sort((a, z) => z.m.score - a.m.score);
  // Coinciden en lo visible, pero alguna cifra es confidencial: nuestro equipo puede confirmarlo.
  const hidden = evaluated.filter((x) => !x.m.ok && x.m.required.every((r) => r.result !== "no"));
  const optional = [
    b.debtEbitdaMax != null && `Deuda/EBITDA ≤ ${b.debtEbitdaMax}x`,
    c.employees.length > 0 && `Empleados: ${c.employees.join(", ")}`,
    b.intlOps !== "indistinto" && INTL_OPS[b.intlOps],
    b.topClientMax != null && `Cliente principal ≤ ${b.topClientMax}% de ventas`,
  ].filter(Boolean);

  const Row = ({ o, m }: (typeof evaluated)[number]) => (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div className="row-main">
        <div className="hstack gap-8 small fw7">{o.code}{o.isDemo && <DemoFlag />}</div>
        <div className="fw6 mt-4" style={{ fontSize: 16 }}>{o.title ?? "Sin título"}</div>
        <div className="small c-lead mt-4 mb-8">{o.sales != null ? `${fmtMoney(o.sales, o.currency)} ventas` : "Ventas confidenciales"} · {o.margin != null ? `${fmtPct(o.margin)} margen` : "margen confidencial"}</div>
        <Checks items={[...m.required, ...m.optional]} />
      </div>
      <Link prefetch={false} href={`/oportunidades/${o.code}`} className="btn btn-secondary btn-sm">Ver oportunidad</Link>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Link prefetch={false} href="/busquedas">Mis búsquedas</Link> · {b.code}</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>{c.sectors.join(", ")}</h1>
          <div className="small c-lead">Registrada {fmtDate(b.createdAt)} · Actualizada {fmtDate(b.updatedAt)}</div>
        </div>
        <div className="wrap-gap">
          <Badge b={BUY_SEARCH_BADGE[b.status]!} />
          {b.status !== "activa" && <ActionButton action={setMyBuySearchStatusAction.bind(null, id, "activa")} icon="play_circle">Reactivar</ActionButton>}
          {b.status === "activa" && <ActionButton action={setMyBuySearchStatusAction.bind(null, id, "pausada")} icon="pause_circle">Pausar</ActionButton>}
          {b.status !== "cerrada" && <ActionButton action={setMyBuySearchStatusAction.bind(null, id, "cerrada")} icon="check_circle" confirm={{ title: `Cerrar ${b.code}`, body: "Dejará de recibir avisos de esta búsqueda. Puede reactivarla después." }} confirmLabel="Cerrar búsqueda">Cerrar</ActionButton>}
          <ActionButton action={deleteMyBuySearchAction.bind(null, id)} className="btn btn-danger btn-sm" icon="delete" danger confirm={{ title: `Eliminar ${b.code}`, body: "Se eliminará la búsqueda. Esta acción no se puede deshacer." }} confirmLabel="Eliminar">Eliminar</ActionButton>
        </div>
      </div>

      <div className="card card-pad mb-24">
        <div className="label-caps mb-8">Criterios</div>
        <div className="small" style={{ lineHeight: 1.7 }}>
          <div><strong>Ventas:</strong> {rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)} · <strong>Margen EBITDA:</strong> {rangeText(b.marginMin, b.marginMax, "%")}</div>
          <div><strong>Región:</strong> {c.regions.join(", ")}</div>
          <div><strong>Industria:</strong> {c.sectors.join(", ")}</div>
          <div><strong>Opcionales:</strong> {optional.length ? optional.join(" · ") : "ninguno"}</div>
        </div>
      </div>

      <h2 className="h3 mb-8">Oportunidades que coinciden · {matches.length}</h2>
      <p className="small c-lead mb-16">Cumplen sus cuatro criterios obligatorios con la información visible en el catálogo.</p>
      {matches.length === 0 ? (
        <Empty icon="search_off" title="Ninguna oportunidad coincide por ahora" text="Le avisaremos por notificación y correo cuando se publique una que coincida." />
      ) : (
        <div className="card rows mb-24">{matches.map((x) => <Row key={x.o.id} {...x} />)}</div>
      )}

      {hidden.length > 0 && (
        <>
          <h2 className="h3 mt-32 mb-8">Podrían coincidir · {hidden.length}</h2>
          <p className="small c-lead mb-16">Coinciden en lo visible, pero alguna cifra es confidencial. Solicite información para conocerla.</p>
          <div className="card rows mb-24">{hidden.map((x) => <Row key={x.o.id} {...x} />)}</div>
        </>
      )}

      <div className="mt-32"><BuyPublication b={b} defaultType={user.organization?.type} /></div>
      <BuyResponses items={responses} />

      <div className="card card-pad mt-32">
        <h2 className="h3 mb-16"><Icon name="tune" /> Editar criterios</h2>
        <BuySearchForm action={updateMyBuySearchAction.bind(null, id)} b={b} buyer />
      </div>
    </div>
  );
}
