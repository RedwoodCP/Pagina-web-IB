import type { Metadata } from "next";
import { db } from "@/lib/db";
import { INVITATION_BADGE, PROFILES, invitationState } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { Badge, DemoFlag, Empty } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { resendInvitationAction, revokeInvitationAction } from "@/app/actions/admin";
import { FilterChips } from "../filter-chips";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Invitaciones" };

export default async function Invitaciones({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const estado = (await searchParams).estado ?? "todas";
  const all = (await db.invitation.findMany({ orderBy: { createdAt: "desc" }, include: { invitedBy: { select: { name: true } } } })).map((i) => ({ ...i, st: invitationState(i) }));
  const n = (s: string) => all.filter((i) => i.st === s).length;
  const list = all.filter((i) => estado === "todas" || i.st === estado);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
      <div style={{ flex: "0 1 380px", minWidth: 280 }}><InviteForm /></div>
      <div style={{ flex: "1 1 520px", minWidth: 0 }}>
        <FilterChips base="/admin/invitaciones" param="estado" current={estado} options={[["todas", "Todas", all.length], ["enviada", "Enviadas", n("enviada")], ["aceptada", "Aceptadas", n("aceptada")], ["vencida", "Vencidas", n("vencida")], ["revocada", "Revocadas", n("revocada")]]} />
        {list.length === 0 ? (
          <Empty icon="forward_to_inbox" title="Sin invitaciones en este estado" />
        ) : (
          <div className="card rows">
            {list.map((i) => (
              <div key={i.id} className="row">
                <div className="row-main">
                  <div className="hstack gap-8 fw6" style={{ fontSize: 16 }}>{i.email}{i.isDemo && <DemoFlag />}</div>
                  <div className="small c-lead mt-4">{PROFILES[i.profile]} · Enviada {fmtDate(i.createdAt)} · {i.st === "aceptada" ? `Aceptada ${fmtDate(i.acceptedAt)}` : i.st === "revocada" ? `Revocada ${fmtDate(i.revokedAt)}` : `Vence ${fmtDate(i.expiresAt)}`}{i.invitedBy ? ` · por ${i.invitedBy.name}` : ""}</div>
                </div>
                <Badge b={INVITATION_BADGE[i.st]!} />
                <div className="row-actions">
                  {(i.st === "enviada" || i.st === "vencida") && (
                    <ActionButton action={resendInvitationAction.bind(null, i.id)} confirm={{ title: "Reenviar invitación", body: "Se generará un enlace nuevo con 14 días de vigencia. El enlace anterior dejará de funcionar." }} confirmLabel="Reenviar">Reenviar</ActionButton>
                  )}
                  {i.st === "enviada" && (
                    <ActionButton action={revokeInvitationAction.bind(null, i.id)} danger confirm={{ title: "Revocar invitación", body: `El enlace enviado a ${i.email} dejará de funcionar de inmediato.` }} confirmLabel="Revocar">Revocar</ActionButton>
                  )}
                  {(i.st === "aceptada" || i.st === "revocada") && <span className="small c-lead">Sin acciones</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
