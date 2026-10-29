import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORG_TYPES } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { canSeeDemand, criteria, demandWhere, rangeText } from "@/lib/buy-search";
import { Empty, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Compradores buscando" };

export default async function Compradores() {
  const user = await requireMember();
  if (!canSeeDemand(user)) redirect("/panel");
  // Solo campos anónimos: nunca el cliente, las notas ni quién la registró.
  const list = await db.buySearch.findMany({
    where: demandWhere(user.id),
    select: { id: true, code: true, title: true, summary: true, buyerType: true, currency: true, salesMin: true, salesMax: true, marginMin: true, marginMax: true, regions: true, sectors: true, employees: true, teaserKey: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Venta</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>Compradores buscando</h1>
          <p className="lead">Perfiles anónimos de compradores de la red. Si tiene una empresa que encaja, propóngala.</p>
        </div>
      </div>
      {list.length === 0 ? (
        <Empty icon="person_search" title="No hay búsquedas publicadas por ahora" text="Cuando un comprador publique lo que busca, aparecerá aquí." />
      ) : (
        <div className="card rows">
          {list.map((b) => {
            const c = criteria(b);
            return (
              <div key={b.id} className="row" style={{ alignItems: "flex-start" }}>
                <div className="row-main">
                  <div className="small fw7">{b.code} · {ORG_TYPES[b.buyerType ?? ""] ?? "Comprador"}</div>
                  <div className="fw6 mt-4" style={{ fontSize: 17 }}>{b.title}</div>
                  <div className="small c-lead mt-4">{c.sectors.join(", ")} · {c.regions.join(", ")}</div>
                  <div className="small c-lead">Ventas {rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)} · Margen EBITDA {rangeText(b.marginMin, b.marginMax, "%")}{b.teaserKey ? " · Con perfil PDF" : ""}</div>
                  <div className="small c-lead">Publicada {fmtDate(b.publishedAt)}</div>
                </div>
                <Link prefetch={false} href={`/compradores/${b.code}`} className="btn btn-secondary btn-sm"><Icon name="visibility" />Ver</Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
