import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { LISTING_BADGE } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { Badge, Banner, DemoFlag, Empty, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { createListingAction } from "@/app/actions/seller";

export const metadata: Metadata = { title: "Mis publicaciones" };

export default async function Venta() {
  const user = await requireMember();
  const listings = await db.listing.findMany({
    where: { OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id } } }] },
    include: { engagements: { select: { ndaStatus: true, accessStatus: true } }, collaborators: { where: { userId: user.id } }, _count: { select: { questions: { where: { answer: null } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const seller = user.canSell || user.isAdvisor;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{user.isAdvisor ? "Panel del asesor" : "Panel del vendedor"}</div>
          <h1 className="h1-lg" style={{ marginTop: 12 }}>{user.isAdvisor ? "Mis mandatos" : "Mis publicaciones"}</h1>
        </div>
        {seller && <ActionButton action={createListingAction} className="btn btn-lg" icon="add">Nueva publicación</ActionButton>}
      </div>
      {!seller && <div className="mb-24"><Banner tone="info">Su perfil no tiene habilitada la venta. Puede activarla en <Link href="/perfil">Mi perfil</Link>.</Banner></div>}
      {listings.length === 0 ? (
        <Empty icon="storefront" title="Aún no tiene publicaciones" text="Cree un borrador: puede guardarlo y completarlo por partes. Nuestro equipo lo revisa antes de publicarlo de forma anónima.">
          {seller && <ActionButton action={createListingAction} className="btn" icon="add">Crear borrador</ActionButton>}
        </Empty>
      ) : (
        <div className="card rows">
          {listings.map((l) => {
            const interested = l.engagements.length;
            const pending = l.engagements.filter((e) => e.ndaStatus === "firmado" && e.accessStatus === "pendiente").length;
            const role = l.ownerId === user.id ? null : l.collaborators[0]?.role;
            const meta = {
              publicada: `${interested} interesados${pending ? ` · ${pending} por decidir` : ""}${l._count.questions ? ` · ${l._count.questions} ${l._count.questions === 1 ? "pregunta" : "preguntas"} sin responder` : ""}`,
              borrador: `Sin enviar · Paso ${Math.min(l.step, 6)} de 6`,
              revision: "Revisión del equipo: 2–3 días hábiles",
              cambios: "El equipo solicitó cambios",
              retirada: `Fuera del catálogo · ${interested} interesados`,
            }[l.status];
            const editable = l.status === "borrador" || l.status === "cambios";
            return (
              <div key={l.id} className="row" style={{ padding: "20px" }}>
                <div className="row-main">
                  <div className="hstack gap-8 small fw7">{l.code}{l.isDemo && <DemoFlag />}{role && <span className="tag tag-outline">Colaborador · {role}</span>}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{l.legalName || l.title || "Sin nombre"}</div>
                  <div className="small c-lead mt-4">{[l.sector, l.region].filter(Boolean).join(" · ") || "Datos pendientes"} · Actualizada {fmtDate(l.updatedAt)}</div>
                </div>
                <Badge b={LISTING_BADGE[l.status]!} />
                <span className="small" style={{ minWidth: 200 }}>{meta}</span>
                <div className="row-actions">
                  {editable && <Link href={`/venta/${l.id}/editar?paso=${Math.min(l.step, 6)}`} className="btn btn-sm">{l.status === "cambios" ? "Corregir" : "Continuar borrador"}</Link>}
                  <Link href={`/venta/${l.id}`} className="btn btn-secondary btn-sm">{l.status === "publicada" || l.status === "retirada" ? "Gestionar interesados" : "Ver detalle"}</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="small c-lead mt-16"><Icon name="info" size={16} /> Usted decide quién accede. La firma del NDA no concede acceso automático.</p>
    </div>
  );
}
