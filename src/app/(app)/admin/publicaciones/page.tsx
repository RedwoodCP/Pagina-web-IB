import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { LISTING_BADGE, RELATIONSHIP } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { Badge, DemoFlag, Empty } from "@/components/ui";
import { FilterChips } from "../filter-chips";

export const metadata: Metadata = { title: "Publicaciones" };

export default async function Publicaciones({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const estado = (await searchParams).estado ?? "revision";
  const all = await db.listing.findMany({ where: { status: { not: "borrador" } }, include: { owner: { select: { name: true, isAdvisor: true, organization: { select: { name: true } } } }, _count: { select: { engagements: true } } }, orderBy: { updatedAt: "desc" } });
  const drafts = await db.listing.count({ where: { status: "borrador" } });
  const n = (s: string) => all.filter((l) => l.status === s).length;
  const list = all.filter((l) => estado === "todas" || l.status === estado);
  return (
    <>
      <FilterChips base="/admin/publicaciones" def="revision" param="estado" current={estado} options={[["revision", "En revisión", n("revision")], ["publicada", "Publicadas", n("publicada")], ["cambios", "Cambios solicitados", n("cambios")], ["retirada", "Retiradas", n("retirada")], ["todas", "Todas", all.length]]} />
      {list.length === 0 ? (
        <Empty icon="fact_check" title={estado === "revision" ? "No hay publicaciones pendientes de revisión" : "Sin publicaciones en este estado"} text={`Hay ${drafts} borradores en preparación por vendedores (no visibles para revisión hasta que se envíen).`} />
      ) : (
        <div className="card rows">
          {list.map((l) => (
            <div key={l.id} className="row">
              <div className="row-main">
                <div className="hstack gap-8 small fw7">{l.code}{l.isDemo && <DemoFlag />}</div>
                <div className="fw6 mt-4" style={{ fontSize: 17 }}>{l.title ?? "Sin título"}</div>
                <div className="small c-lead mt-4">{l.sector} · {l.region} · Por {l.owner.name} ({l.owner.organization?.name ?? "—"}) · {RELATIONSHIP[l.relationship]}</div>
              </div>
              <span className="small c-lead">{l.status === "revision" ? `Enviada ${fmtDate(l.submittedAt, false)}` : `${l._count.engagements} interesados`}</span>
              <Badge b={LISTING_BADGE[l.status]!} />
              <Link prefetch={false} href={`/admin/publicaciones/${l.id}`} className={l.status === "revision" ? "btn btn-sm" : "btn btn-secondary btn-sm"}>{l.status === "revision" ? "Revisar" : "Ver"}</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
