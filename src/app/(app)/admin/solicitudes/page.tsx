import type { Metadata } from "next";
import { db } from "@/lib/db";
import { INTERESTS, MEMBERSHIP_BADGE, ORG_TYPES } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { Badge, DemoFlag, Empty } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { approveRequestAction, rejectRequestAction } from "@/app/actions/admin";
import { FilterChips } from "../filter-chips";

export const metadata: Metadata = { title: "Solicitudes de membresía" };

export default async function Solicitudes({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const estado = (await searchParams).estado ?? "todas";
  const all = await db.membershipRequest.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }] });
  const list = all.filter((r) => estado === "todas" || r.status === estado).sort((a, b) => Number(b.status === "pendiente") - Number(a.status === "pendiente"));
  const n = (s: string) => all.filter((r) => r.status === s).length;
  return (
    <>
      <FilterChips base="/admin/solicitudes" param="estado" current={estado} options={[["todas", "Todas", all.length], ["pendiente", "Pendientes", n("pendiente")], ["aprobada", "Aprobadas", n("aprobada")], ["rechazada", "Rechazadas", n("rechazada")]]} />
      {list.length === 0 ? (
        <Empty icon="how_to_reg" title="No hay solicitudes en este estado" />
      ) : (
        <div className="card rows">
          {list.map((r) => (
            <div key={r.id} className="row">
              <div className="row-main">
                <div className="hstack gap-8 fw6" style={{ fontSize: 17 }}>{r.name}{r.isDemo && <DemoFlag />}</div>
                <div className="small c-lead mt-4">{r.organization} · {r.email}{r.phone ? ` · ${r.phone}` : ""} · Folio {r.reference}</div>
                {r.message && <div className="small mt-4" style={{ color: "#444" }}>«{r.message}»</div>}
                {r.reviewNote && <div className="small c-lead mt-4">Nota interna: {r.reviewNote}</div>}
              </div>
              <span className="small" style={{ minWidth: 220 }}>{ORG_TYPES[r.orgType] ?? r.orgType} · Quiere: {INTERESTS[r.interest] ?? r.interest}</span>
              <span className="small c-lead num">{fmtDate(r.createdAt, false)}</span>
              <Badge b={MEMBERSHIP_BADGE[r.status]!} />
              {r.status === "pendiente" && (
                <div className="row-actions">
                  <ActionButton action={approveRequestAction.bind(null, r.id)} className="btn btn-sm" confirm={{ title: `Aprobar a ${r.name}`, body: `Se creará una invitación personal para ${r.email}, vigente 14 días.` }} confirmLabel="Aprobar e invitar" reason reasonLabel="Nota interna">Aprobar e invitar</ActionButton>
                  <ActionButton action={rejectRequestAction.bind(null, r.id)} className="btn btn-secondary btn-sm" danger confirm={{ title: `Rechazar a ${r.name}`, body: "Se enviará un correo genérico. El motivo queda solo en la bitácora interna." }} confirmLabel="Rechazar" reason reasonLabel="Motivo interno">Rechazar</ActionButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
