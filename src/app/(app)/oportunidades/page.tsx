import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getCatalog, parseFilters } from "@/lib/catalog";
import { DEAL_TYPES, MARGIN_RANGES, REGIONS, SECTORS, ebitdaRanges, salesRanges, CURRENCY_PREFIX, type Range } from "@/lib/domain";
import { OpportunityCard } from "@/components/opportunity";
import { Empty } from "@/components/ui";
import { CatalogControls, type Group } from "./filters";

export const metadata: Metadata = { title: "Catálogo privado" };

const opts = (r: Range[]) => r.map((x) => ({ value: x.key, label: x.label }));
const list = (a: readonly string[]) => a.map((v) => ({ value: v, label: v }));

export default async function Catalogo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireMember();
  const f = parseFilters(await searchParams);
  const { items, total } = await getCatalog(user, f);
  const p = CURRENCY_PREFIX[f.currency];
  const groups: Group[] = [
    { key: "sector", title: "Industria", icon: "domain", options: list(SECTORS) },
    { key: "tipo", title: "Tipo", icon: "tune", options: list(DEAL_TYPES) },
    { key: "ebitda", title: "EBITDA", icon: "attach_money", note: `Monto anual en ${f.currency} (EBITDA monetario). Las oportunidades con EBITDA confidencial no aparecen.`, options: opts(ebitdaRanges(f.currency)) },
    { key: "margen", title: "Margen EBITDA", icon: "percent", note: "EBITDA ÷ ventas. Mide rentabilidad, no tamaño.", options: opts(MARGIN_RANGES) },
    { key: "region", title: "Ubicación", icon: "public", options: list(REGIONS) },
    { key: "ventas", title: "Ventas", icon: "bar_chart", note: `Ventas anuales en ${f.currency}. No convertimos entre monedas.`, options: opts(salesRanges(f.currency)) },
    {
      key: "precio", title: "Precio", icon: "sell", single: true, note: "Precio indicativo mínimo. Excluye oportunidades «a negociar» o con precio confidencial.",
      options: (f.currency === "MXN" ? [250, 500, 1000] : [15, 25, 50]).map((v) => ({ value: String(v), label: `≤ ${p} ${v.toLocaleString("es-MX")} M` })),
    },
  ];
  return (
    <div className="page">
      <div className="eyebrow">Catálogo privado · Solo miembros aprobados</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>Oportunidades</h1>
      <p className="lead" style={{ marginBottom: 28 }}>
        {total} {total === 1 ? "oportunidad publicada" : "oportunidades publicadas"} · Las identidades se revelan solo con autorización del vendedor.
        {user.isAdmin && " Vista de solo lectura para administración."}
      </p>
      <CatalogControls groups={groups} count={items.length}>
        {items.length === 0 ? (
          total === 0 ? (
            <Empty icon="inventory_2" title="Aún no hay oportunidades publicadas" text="Le avisaremos cuando nuestro equipo apruebe nuevas oportunidades." />
          ) : (
            <Empty icon="filter_alt_off" title="Ninguna oportunidad coincide con estos filtros" text="Pruebe con menos criterios o amplíe los rangos de ventas, EBITDA o precio. Los filtros de monto solo consideran oportunidades en la moneda seleccionada.">
              <Link prefetch={false} href="/oportunidades" className="btn">Limpiar filtros</Link>
            </Empty>
          )
        ) : (
          <div className="stack gap-16">
            {items.map((o) => <OpportunityCard key={o.id} o={o} isAdmin={user.isAdmin} />)}
          </div>
        )}
      </CatalogControls>
    </div>
  );
}
