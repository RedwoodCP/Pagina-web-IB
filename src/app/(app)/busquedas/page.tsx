import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalog, parseFilters } from "@/lib/catalog";
import { fmtDate } from "@/lib/format";
import { BUY_SEARCH_BADGE, criteria, matchPublic, rangeText } from "@/lib/buy-search";
import { Badge, Empty, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Mis búsquedas" };

export default async function MisBusquedas() {
  const user = await requireMember();
  if (user.isAdmin) redirect("/admin/busquedas");
  if (!user.canBuy) redirect("/venta");
  const [list, { items }] = await Promise.all([
    db.buySearch.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } }),
    getCatalog(user, parseFilters({})),
  ]);
  const others = items.filter((o) => !o.isOwn);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Compra</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>Mis búsquedas</h1>
          <p className="lead">Indique qué empresa busca comprar. Le avisaremos cuando se publique una oportunidad que coincida.</p>
        </div>
        <Link prefetch={false} href="/busquedas/nueva" className="btn btn-lg"><Icon name="add" />Nueva búsqueda</Link>
      </div>
      {list.length === 0 ? (
        <Empty icon="travel_explore" title="Aún no registra búsquedas" text="Defina ventas, margen EBITDA, región e industria de la empresa que busca y, si quiere, criterios adicionales. Nuestro equipo también las revisa para presentarle oportunidades." />
      ) : (
        <div className="card rows">
          {list.map((b) => {
            const c = criteria(b);
            const n = others.filter((o) => matchPublic(b, o).ok).length;
            return (
              <div key={b.id} className="row">
                <div className="row-main">
                  <div className="small fw7">{b.code}</div>
                  <div className="fw6 mt-4">{c.sectors.join(", ")}</div>
                  <div className="small c-lead mt-4">{c.regions.join(", ")} · Ventas {rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)} · Margen {rangeText(b.marginMin, b.marginMax, "%")}</div>
                  <div className="small c-lead">Actualizada {fmtDate(b.updatedAt)}</div>
                </div>
                <span className="small fw6">{n} {n === 1 ? "coincidencia" : "coincidencias"}</span>
                <Badge b={BUY_SEARCH_BADGE[b.status]!} />
                <Link prefetch={false} href={`/busquedas/${b.id}`} className="btn btn-secondary btn-sm">Ver</Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
