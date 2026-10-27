import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ACCESS_BADGE, NDA_BADGE } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { Badge, Empty } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { adminAccessAction } from "@/app/actions/admin";
import { FilterChips } from "../filter-chips";

export const metadata: Metadata = { title: "Accesos" };

export default async function Accesos({ searchParams }: { searchParams: Promise<{ estado?: string; op?: string }> }) {
  const sp = await searchParams;
  const estado = sp.estado ?? "todas";
  const all = await db.engagement.findMany({
    where: sp.op ? { listing: { code: sp.op } } : {},
    include: { listing: { select: { code: true, title: true, id: true } }, user: { select: { name: true, organization: { select: { name: true } } } }, nda: { select: { method: true, signedKey: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const n = (s: string) => all.filter((e) => e.accessStatus === s).length;
  const list = all.filter((e) => estado === "todas" || e.accessStatus === estado);
  const reason = { reason: true, reasonRequired: true, reasonLabel: "Motivo de la intervención (queda en la bitácora)" };
  return (
    <>
      <p className="c-lead mb-16" style={{ marginTop: -8 }}>
        Las decisiones de acceso corresponden al vendedor o a su asesor. El equipo interviene solo de forma excepcional y siempre con motivo registrado.
        {sp.op && <> Filtrado por <strong>{sp.op}</strong> · <Link prefetch={false} href="/admin/accesos">quitar filtro</Link></>}
      </p>
      <FilterChips base={`/admin/accesos${sp.op ? `?op=${sp.op}` : ""}`} param="estado" current={estado} options={[["todas", "Todos", all.length], ["pendiente", "Pendientes", n("pendiente")], ["autorizado", "Autorizados", n("autorizado")], ["rechazado", "Rechazados", n("rechazado")], ["revocado", "Revocados", n("revocado")], ["none", "Sin NDA", n("none")]]} />
      {list.length === 0 ? (
        <Empty icon="key" title="Sin registros" />
      ) : (
        <div className="card rows">
          {list.map((e) => (
            <div key={e.id} className="row">
              <div className="row-main">
                <div className="fw6">{e.organizationName ?? e.user.organization?.name ?? e.user.name}</div>
                <div className="small c-lead mt-4"><Link prefetch={false} href={`/oportunidades/${e.listing.code}`}>{e.listing.code}</Link> · {e.listing.title} · {e.user.name} · {fmtDate(e.updatedAt, false)}</div>
              </div>
              <Badge b={e.ndaStatus === "firmado" ? (e.nda?.method === "registro_interno" ? NDA_BADGE.aceptado! : NDA_BADGE.firmado!) : NDA_BADGE.pendiente_firma!} />
              <Badge b={ACCESS_BADGE[e.accessStatus]!} />
              {e.nda?.signedKey && <a className="btn btn-secondary btn-sm" href={`/api/nda-firmado/${e.id}`} target="_blank" rel="noopener">NDA firmado</a>}
              {e.ndaStatus === "firmado" && (
                <div className="row-actions">
                  {e.accessStatus !== "autorizado" && <ActionButton action={adminAccessAction.bind(null, e.id, "autorizado")} confirm={{ title: "Autorizar acceso (intervención)", body: "Se notificará al comprador y al vendedor." }} confirmLabel="Autorizar" {...reason}>Autorizar</ActionButton>}
                  {e.accessStatus === "pendiente" && <ActionButton action={adminAccessAction.bind(null, e.id, "rechazado")} danger confirm={{ title: "Rechazar acceso (intervención)", body: "Se notificará al comprador y al vendedor." }} confirmLabel="Rechazar" {...reason}>Rechazar</ActionButton>}
                  {e.accessStatus === "autorizado" && <ActionButton action={adminAccessAction.bind(null, e.id, "revocado")} danger confirm={{ title: "Revocar acceso (intervención)", body: "El comprador dejará de ver el espacio privado de inmediato." }} confirmLabel="Revocar" {...reason}>Revocar</ActionButton>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
