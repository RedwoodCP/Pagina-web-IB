import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Listing } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { BUY_SEARCH_BADGE, INTL_OPS, criteria, marginOf, matchListing, rangeText, type Check } from "@/lib/buy-search";
import { Badge, DemoFlag, Empty, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { deleteBuySearchAction, setBuySearchStatusAction, updateBuySearchAction } from "@/app/actions/buy-search";
import { BuySearchForm } from "@/components/buy-search-form";
import { BuyPublication } from "@/components/buy-publication";
import { BuyResponses } from "@/components/buy-responses";
import { reviewPublicationAction } from "@/app/actions/buy-demand";
import { PUBLICATION_BADGE } from "@/lib/buy-search";

export const metadata: Metadata = { title: "Búsqueda de compra" };

const ICON = { si: ["check_circle", "c-ok"], no: ["cancel", "c-err"], sin_dato: ["help", "c-lead"] } as const;

function Checks({ items }: { items: Check[] }) {
  return (
    <div className="wrap-gap small" style={{ gap: 14 }}>
      {items.map((c) => (
        <span key={c.label} className="hstack gap-4" title={c.result === "sin_dato" ? "La oportunidad no tiene este dato" : undefined}>
          <span aria-hidden="true" className={"ms " + ICON[c.result][1]} style={{ fontSize: 16 }}>{ICON[c.result][0]}</span>
          <span><strong>{c.label}:</strong> {c.detail}{c.result === "sin_dato" ? " (sin dato)" : c.result === "no" ? " (no cumple)" : ""}</span>
        </span>
      ))}
    </div>
  );
}

function ListingRow({ l, m }: { l: Listing; m: ReturnType<typeof matchListing> }) {
  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div className="row-main">
        <div className="hstack gap-8 small fw7">{l.code}{l.isDemo && <DemoFlag />}</div>
        <div className="fw6 mt-4" style={{ fontSize: 16 }}>{l.title ?? "Sin título"}</div>
        <div className="small c-lead mt-4 mb-8">{l.legalName ? `${l.legalName} · ` : ""}{fmtMoney(l.sales, l.currency)} ventas · {fmtPct(marginOf(l))} margen</div>
        <Checks items={m.required} />
        {m.optional.length > 0 && <div className="mt-8"><Checks items={m.optional} /></div>}
      </div>
      {m.optional.length > 0 && <span className="small fw6">{m.score}/{m.optional.length} opcionales</span>}
      <Link prefetch={false} href={`/oportunidades/${l.code}`} className="btn btn-secondary btn-sm">Ver oportunidad</Link>
    </div>
  );
}

export default async function Busqueda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await db.buySearch.findUnique({ where: { id }, include: {
      createdBy: { select: { name: true } },
      owner: { select: { name: true, email: true, organization: { select: { type: true } } } },
      responses: { include: { listing: { select: { code: true, title: true } }, responder: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    } });
  if (!b) notFound();
  const c = criteria(b);
  const listings = await db.listing.findMany({ where: { status: "publicada", ...(env.showDemo ? {} : { isDemo: false }) }, orderBy: { publishedAt: "desc" } });
  const evaluated = listings.map((l) => ({ l, m: matchListing(b, l) }));
  const matches = evaluated.filter((x) => x.m.ok).sort((a, z) => z.m.score - a.m.score);
  // Casi coinciden: fallan un solo criterio obligatorio (útil para ampliar la búsqueda).
  const near = evaluated.filter((x) => !x.m.ok && x.m.required.filter((r) => r.result !== "si").length === 1).slice(0, 10);
  const optional = [
    b.debtEbitdaMax != null && `Deuda/EBITDA ≤ ${b.debtEbitdaMax}x`,
    c.employees.length > 0 && `Empleados: ${c.employees.join(", ")}`,
    b.intlOps !== "indistinto" && INTL_OPS[b.intlOps],
    b.topClientMax != null && `Cliente principal ≤ ${b.topClientMax}% de ventas`,
  ].filter(Boolean);

  return (
    <>
      <div className="page-head mb-24">
        <div>
          <div className="hstack gap-8 small fw7"><Link prefetch={false} href="/admin/busquedas">Búsquedas de compra</Link> / {b.code}</div>
          <h2 className="h2 mt-8">{b.clientName}</h2>
          <div className="small c-lead mt-4">{b.owner ? `Registrada por el comprador ${b.owner.name} (${b.owner.email}) el ${fmtDate(b.createdAt)}` : `Registrada ${fmtDate(b.createdAt)}${b.createdBy ? ` por ${b.createdBy.name}` : ""}`} · Actualizada {fmtDate(b.updatedAt)}</div>
        </div>
        <div className="wrap-gap">
          <Badge b={BUY_SEARCH_BADGE[b.status]!} />
          {b.status !== "activa" && <ActionButton action={setBuySearchStatusAction.bind(null, id, "activa")} icon="play_circle">Reactivar</ActionButton>}
          {b.status === "activa" && <ActionButton action={setBuySearchStatusAction.bind(null, id, "pausada")} icon="pause_circle">Pausar</ActionButton>}
          {b.status !== "cerrada" && <ActionButton action={setBuySearchStatusAction.bind(null, id, "cerrada")} icon="check_circle" confirm={{ title: `Cerrar ${b.code}`, body: "La búsqueda deja de aparecer entre las activas. Puede reactivarla después." }} confirmLabel="Cerrar búsqueda">Cerrar</ActionButton>}
          <ActionButton action={deleteBuySearchAction.bind(null, id)} className="btn btn-danger btn-sm" icon="delete" danger confirm={{ title: `Eliminar ${b.code}`, body: "Se eliminará la búsqueda y sus criterios. Esta acción no se puede deshacer." }} confirmLabel="Eliminar">Eliminar</ActionButton>
        </div>
      </div>

      <div className="card card-pad mb-24">
        <div className="label-caps mb-8">Criterios</div>
        <div className="small" style={{ lineHeight: 1.7 }}>
          <div><strong>Ventas:</strong> {rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)} · <strong>Margen EBITDA:</strong> {rangeText(b.marginMin, b.marginMax, "%")}</div>
          <div><strong>Región:</strong> {c.regions.join(", ")}</div>
          <div><strong>Industria:</strong> {c.sectors.join(", ")}</div>
          <div><strong>Opcionales:</strong> {optional.length ? optional.join(" · ") : "ninguno"}</div>
          {b.notes && <div className="c-lead mt-8">{b.notes}</div>}
        </div>
      </div>

      <h3 className="h3 mb-8">Oportunidades que coinciden · {matches.length}</h3>
      <p className="small c-lead mb-16">Cumplen los cuatro criterios obligatorios; se ordenan por cuántos opcionales cumplen. Solo se comparan cifras en {b.currency}.</p>
      {matches.length === 0 ? (
        <Empty icon="search_off" title="Ninguna oportunidad publicada coincide por ahora" text="Cuando se publique una que cumpla los criterios aparecerá aquí." />
      ) : (
        <div className="card rows mb-24">{matches.map(({ l, m }) => <ListingRow key={l.id} l={l} m={m} />)}</div>
      )}

      {near.length > 0 && (
        <>
          <h3 className="h3 mt-32 mb-8">Casi coinciden · {near.length}</h3>
          <p className="small c-lead mb-16">Fallan un solo criterio obligatorio.</p>
          <div className="card rows mb-24">{near.map(({ l, m }) => <ListingRow key={l.id} l={l} m={m} />)}</div>
        </>
      )}

      {b.publication === "revision" && (
        <div className="card card-pad mt-32">
          <div className="hstack between wrap-gap mb-8">
            <h3 className="h3"><Icon name="fact_check" /> Perfil para vendedores · por revisar</h3>
            <Badge b={PUBLICATION_BADGE.revision!} />
          </div>
          <div className="label-caps mt-16">{b.title}</div>
          <p className="mt-8" style={{ whiteSpace: "pre-wrap" }}>{b.summary}</p>
          {b.teaserKey && <a className="btn btn-secondary btn-sm mt-12" href={`/api/busquedas/${b.id}/perfil`} target="_blank" rel="noopener"><Icon name="visibility" />Ver perfil PDF (revise que no identifique al comprador)</a>}
          <div className="wrap-gap mt-16">
            <ActionButton action={reviewPublicationAction.bind(null, id, "publicada")} className="btn btn-sm" icon="check" confirm={{ title: `Publicar ${b.code}`, body: "Vendedores y asesores verán este perfil anónimo y podrán proponer empresas." }} confirmLabel="Publicar">Aprobar y publicar</ActionButton>
            <ActionButton action={reviewPublicationAction.bind(null, id, "rechazada")} icon="edit_note" reason reasonRequired reasonLabel="Cambios que necesita el comprador" confirm={{ title: "Solicitar cambios", body: "El comprador recibirá su comentario." }} confirmLabel="Solicitar cambios">Solicitar cambios</ActionButton>
          </div>
        </div>
      )}
      {b.publication !== "revision" && <div className="mt-32"><BuyPublication b={b} admin defaultType={b.owner?.organization?.type} /></div>}
      <BuyResponses items={b.responses} admin />

      <div className="card card-pad mt-32">
        <h3 className="h3 mb-16"><Icon name="tune" /> Editar criterios</h3>
        <BuySearchForm action={updateBuySearchAction.bind(null, id)} b={b} />
      </div>
    </>
  );
}
