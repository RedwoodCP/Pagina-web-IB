import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import { BUY_SEARCH_BADGE, PUBLICATION_BADGE, criteria, matchListing, rangeText } from "@/lib/buy-search";
import { Badge, Empty, Icon } from "@/components/ui";
import { FilterChips } from "../filter-chips";

export const metadata: Metadata = { title: "Búsquedas de compra" };

export default async function Busquedas({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const estado = (await searchParams).estado ?? "activa";
  const [all, listings] = await Promise.all([
    db.buySearch.findMany({ orderBy: { updatedAt: "desc" } }),
    db.listing.findMany({ where: { status: "publicada", ...(env.showDemo ? {} : { isDemo: false }) } }),
  ]);
  const n = (st: string) => all.filter((b) => b.status === st).length;
  const list = all.filter((b) => estado === "todas" || b.status === estado);
  return (
    <>
      <div className="hstack mb-16" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <FilterChips base="/admin/busquedas" def="activa" param="estado" current={estado} options={[["activa", "Activas", n("activa")], ["pausada", "Pausadas", n("pausada")], ["cerrada", "Cerradas", n("cerrada")], ["todas", "Todas", all.length]]} />
        <Link prefetch={false} href="/admin/busquedas/nueva" className="btn"><Icon name="add" />Nueva búsqueda</Link>
      </div>
      {list.length === 0 ? (
        <Empty icon="travel_explore" title={all.length ? "Sin búsquedas en este estado" : "Aún no hay búsquedas de compra"} text="Registre qué empresa busca comprar un cliente (ventas, margen EBITDA, región e industria) y la plataforma le mostrará las oportunidades publicadas que coinciden." />
      ) : (
        <div className="card rows">
          {list.map((b) => {
            const c = criteria(b);
            const matches = listings.filter((l) => matchListing(b, l).ok).length;
            return (
              <div key={b.id} className="row">
                <div className="row-main">
                  <div className="small fw7">{b.code}</div>
                  <div className="fw6 mt-4" style={{ fontSize: 17 }}>{b.clientName}</div>
                  <div className="small c-lead mt-4">
                    {c.sectors.join(", ")} · {c.regions.join(", ")} · Ventas {rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)} · Margen {rangeText(b.marginMin, b.marginMax, "%")}
                  </div>
                  <div className="small c-lead">{b.ownerId ? "Registrada por el comprador · " : ""}Actualizada {fmtDate(b.updatedAt)}</div>
                </div>
                <span className="small fw6">{matches} {matches === 1 ? "coincidencia" : "coincidencias"}</span>
                {b.publication !== "privada" && <Badge b={PUBLICATION_BADGE[b.publication]!} />}
                <Badge b={BUY_SEARCH_BADGE[b.status]!} />
                <Link prefetch={false} href={`/admin/busquedas/${b.id}`} className="btn btn-secondary btn-sm">Ver</Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
