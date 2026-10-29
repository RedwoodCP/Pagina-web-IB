import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORG_TYPES } from "@/lib/domain";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { INTL_OPS, canSeeDemand, criteria, demandWhere, rangeText } from "@/lib/buy-search";
import { respondToBuySearchAction } from "@/app/actions/buy-demand";
import { ActionForm, Select, Submit, TextArea } from "@/components/form";
import { Banner, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Comprador buscando" };

export default async function Comprador({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireMember();
  if (!canSeeDemand(user)) redirect("/panel");
  const b = await db.buySearch.findFirst({ where: { code, ...demandWhere(user.id) } });
  if (!b) notFound();
  const c = criteria(b);
  const [mine, sent] = await Promise.all([
    db.listing.findMany({
      where: { status: "publicada", OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id, role: "gestor" } } }] },
      select: { id: true, code: true, title: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.buySearchResponse.findMany({ where: { buySearchId: b.id, responderId: user.id }, include: { listing: { select: { code: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const rows: [string, string][] = [
    ["Tipo de comprador", ORG_TYPES[b.buyerType ?? ""] ?? "—"],
    ["Industria", c.sectors.join(", ")],
    ["Región", c.regions.join(", ")],
    ["Ventas anuales", rangeText(b.salesMin, b.salesMax, ` M ${b.currency}`)],
    ["Margen EBITDA", rangeText(b.marginMin, b.marginMax, "%")],
    ...(b.debtEbitdaMax != null ? [["Deuda / EBITDA máxima", `${b.debtEbitdaMax}x`] as [string, string]] : []),
    ...(c.employees.length ? [["Empleados", c.employees.join(", ")] as [string, string]] : []),
    ...(b.intlOps !== "indistinto" ? [["Operación en otros países", INTL_OPS[b.intlOps]!] as [string, string]] : []),
    ...(b.topClientMax != null ? [["Concentración en el cliente principal", `Hasta ${b.topClientMax}% de ventas`] as [string, string]] : []),
  ];
  return (
    <div className="page">
      <div className="eyebrow"><Link prefetch={false} href="/compradores">Compradores buscando</Link> · {b.code}</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>{b.title}</h1>
      <p className="small c-lead mb-24">Publicada {fmtDate(b.publishedAt)} · Identidad del comprador protegida</p>

      <div className="two-col">
        <section className="col-main">
          <p style={{ whiteSpace: "pre-wrap", fontSize: 16, lineHeight: 1.6 }}>{b.summary}</p>
          <dl className="kv card mt-24">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {b.teaserKey && (
            <a className="btn btn-secondary mt-16" href={`/api/busquedas/${b.id}/perfil`} target="_blank" rel="noopener"><Icon name="description" />Ver perfil del comprador (PDF)</a>
          )}
        </section>
        <aside className="col-side">
          <div className="card card-pad">
            <h2 className="h3 mb-8"><Icon name="handshake" /> Proponer una empresa</h2>
            <p className="small c-lead mb-16">El comprador verá la oportunidad anónima y su mensaje, no su nombre. Nuestro equipo también recibe la propuesta.</p>
            {user.isAdmin ? (
              <Banner tone="info">Cambie a la vista de compra y venta para proponer una empresa.</Banner>
            ) : (
              <ActionForm action={respondToBuySearchAction.bind(null, b.code)} resetOnSuccess>
                <Select
                  name="listingId"
                  label="Oportunidad que propone"
                  options={[["", mine.length ? "Una empresa aún no publicada" : "Una empresa aún no publicada (no tiene oportunidades publicadas)"], ...mine.map((l) => [l.id, `${l.code} · ${l.title ?? "Sin título"}`] as [string, string])]}
                  defaultValue={mine[0]?.id ?? ""}
                />
                <div className="mt-16">
                  <TextArea name="message" label="Mensaje para el comprador" required rows={5} maxLength={1500} hint="Por qué encaja. No incluya nombres, marcas ni datos que identifiquen a la empresa." />
                </div>
                <div className="mt-16"><Submit className="btn w-full" icon="send" pendingText="Enviando…">Enviar propuesta</Submit></div>
              </ActionForm>
            )}
            {sent.length > 0 && (
              <div className="mt-24">
                <div className="label-caps mb-8">Sus propuestas</div>
                {sent.map((r) => <div key={r.id} className="small c-lead">{r.listing ? r.listing.code : "Empresa no publicada"} · {fmtDateTime(r.createdAt)}</div>)}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
