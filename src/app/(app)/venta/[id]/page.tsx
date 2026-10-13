import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCtx } from "@/lib/access";
import { ACCESS_BADGE, DOC_CATEGORIES, INTEREST_LEVELS, LISTING_BADGE, MEETING_BADGE, NDA_BADGE, ORG_TYPES } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtSize, parseJson } from "@/lib/format";
import { MAX_FILE_MB, ACCEPT_ATTR } from "@/lib/files";
import { Badge, Banner, DemoFlag, Empty, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { ActionForm, Field, Select, Submit, TextArea } from "@/components/form";
import { UploadForm } from "@/components/upload";
import { DocPermForm } from "@/components/doc-perm";
import {
  addCollaboratorAction, addExclusionAction, answerQuestionAction, decideAccessAction, decideDocRequestAction, decideMeetingAction,
  deleteDocumentAction, removeCollaboratorAction, removeExclusionAction, reopenListingAction, updateDocumentAction, uploadDocumentAction, withdrawListingAction,
} from "@/app/actions/seller";

export const metadata: Metadata = { title: "Gestión de la publicación" };

const TABS = [
  ["interesados", "Interesados"],
  ["documentos", "Documentos"],
  ["preguntas", "Preguntas"],
  ["reuniones", "Reuniones"],
  ["equipo", "Equipo y exclusiones"],
] as const;

export default async function Gestion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  const l = await db.listing.findUnique({
    where: { id },
    include: {
      collaborators: { include: { user: { select: { name: true, email: true } } } },
      exclusions: { include: { organization: true } },
      documents: { orderBy: [{ kind: "desc" }, { category: "asc" }], include: { accessRequests: { include: { user: { select: { name: true, organization: { select: { name: true } } } } } } } },
      engagements: { include: { user: { select: { name: true, email: true, organization: { select: { name: true, type: true } } } }, nda: true, meetings: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } },
      questions: { include: { asker: { select: { name: true, organization: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!l) notFound();
  const ctx = buildCtx(user, l, null);
  if (!ctx.isTeam) notFound();
  const can = ctx.canManage;
  const tabParam = (await searchParams).tab;
  const tab = TABS.some(([k]) => k === tabParam) ? tabParam! : "interesados";
  const E = l.engagements;
  const funnel = [
    ["Interesados", E.length],
    ["NDA firmados", E.filter((e) => e.ndaStatus === "firmado").length],
    ["Pendientes de decisión", E.filter((e) => e.ndaStatus === "firmado" && e.accessStatus === "pendiente").length],
    ["Con acceso autorizado", E.filter((e) => e.accessStatus === "autorizado").length],
  ] as const;
  const docRequests = l.documents.flatMap((d) => d.accessRequests.filter((r) => r.status === "solicitado").map((r) => ({ ...r, doc: d })));
  const openQ = l.questions.filter((q) => !q.answer).length;
  const meetings = E.flatMap((e) => e.meetings.map((m) => ({ ...m, e })));
  const openM = meetings.filter((m) => m.status === "solicitada").length;
  const orgs = tab === "equipo" ? await db.organization.findMany({ where: { id: { notIn: [l.organizationId ?? "", ...l.exclusions.map((x) => x.organizationId)] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const count: Record<string, number> = { interesados: funnel[2][1], documentos: docRequests.length, preguntas: openQ, reuniones: openM };
  const editable = l.status === "borrador" || l.status === "cambios";

  return (
    <div className="page">
      <Link prefetch={false} href="/venta" className="back"><Icon name="arrow_back" />{user.isAdvisor ? "Mis mandatos" : "Mis publicaciones"}</Link>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow hstack gap-8">{l.code} · {l.sector ?? "Sin sector"} · {l.region ?? "Sin región"} {l.isDemo && <DemoFlag />}</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>{l.legalName || "Publicación sin nombre"}</h1>
          <p className="lead">{l.title ?? "Título anónimo pendiente"}</p>
        </div>
        <div className="wrap-gap">
          <Badge b={LISTING_BADGE[l.status]!} />
          {editable && can && <Link prefetch={false} href={`/venta/${id}/editar?paso=${Math.min(l.step, 6)}`} className="btn">Editar</Link>}
          {(l.status === "publicada" || l.status === "revision") && <Link prefetch={false} href={`/oportunidades/${l.code}?vista=comprador`} className="btn btn-secondary">Ver como comprador</Link>}
          {can && (l.status === "publicada" || l.status === "revision") && (
            <ActionButton
              action={withdrawListingAction.bind(null, id)}
              className="btn btn-danger"
              danger
              confirm={{ title: l.status === "revision" ? "Cancelar envío" : "Retirar del catálogo", body: l.status === "revision" ? "La publicación volverá a borrador." : "Dejará de aparecer en el catálogo y no recibirá nuevas solicitudes. Los accesos autorizados se mantienen hasta que los revoque." }}
              confirmLabel={l.status === "revision" ? "Cancelar envío" : "Retirar"}
            >
              {l.status === "revision" ? "Cancelar envío" : "Retirar"}
            </ActionButton>
          )}
          {can && l.status === "retirada" && <ActionButton action={reopenListingAction.bind(null, id)} className="btn btn-secondary">Volver a borrador</ActionButton>}
        </div>
      </div>
      {!can && <div className="mb-24"><Banner tone="info">Usted es colaborador con permiso de lectura: puede ver interesados pero no decidir accesos.</Banner></div>}
      {l.status === "cambios" && l.reviewNote && <div className="mb-24"><Banner tone="warn" icon="edit_note"><strong>Cambios solicitados:</strong> {l.reviewNote}</Banner></div>}

      <nav className="tabs mb-24" aria-label="Secciones">
        {TABS.map(([k, label]) => (
          <Link prefetch={false} key={k} href={`/venta/${id}${k === "interesados" ? "" : `?tab=${k}`}`} className="tab" aria-current={tab === k ? "page" : undefined}>
            {label}
            {!!count[k] && <span className="count-pill">{count[k]}</span>}
          </Link>
        ))}
      </nav>

      {tab === "interesados" && (
        <>
          <div className="kpis mb-24">
            {funnel.map(([lab, v]) => (
              <div key={lab}><div className="label-caps">{lab}</div><div className="kv-big">{v}</div></div>
            ))}
          </div>
          <div className="panel-muted hstack gap-12 mb-16" style={{ fontSize: 15 }}>
            <Icon name="info" />
            Usted decide quién accede. La firma del NDA no concede acceso automático: autorice, rechace o revoque a cada interesado.
          </div>
          {E.length === 0 ? (
            <Empty icon="group" title="Aún no hay interesados" text={l.status === "publicada" ? "Cuando un miembro solicite información, aparecerá aquí." : "Los interesados aparecerán cuando la publicación esté en el catálogo."} />
          ) : (
            <div className="card rows">
              {E.map((e) => {
                const orgName = e.organizationName ?? e.user.organization?.name ?? "—";
                const ndaB = e.ndaStatus === "firmado" ? (e.nda?.method === "registro_interno" ? NDA_BADGE.aceptado! : NDA_BADGE.firmado!) : NDA_BADGE.pendiente_firma!;
                const reason = { reason: true, reasonLabel: "Nota para el interesado" };
                return (
                  <div key={e.id} className="row">
                    <div className="row-main">
                      <div className="fw6" style={{ fontSize: 16 }}>{orgName}</div>
                      <div className="small c-lead mt-4">
                        {ORG_TYPES[e.user.organization?.type ?? ""] ?? "—"}
                        {e.representation === "tercero" && ` · representa a ${e.clientName ?? "un comprador"}`} · {e.user.name} · Solicitó {fmtDate(e.createdAt, false)}
                        {e.accessStatus === "autorizado" && ` · Interés: ${INTEREST_LEVELS[e.interestLevel]}`}
                      </div>
                    </div>
                    <div className="row-actions">
                      <Badge b={ndaB} title={e.nda ? `${e.nda.signerName} · ${fmtDateTime(e.nda.completedAt)}` : undefined} />
                      <Badge b={ACCESS_BADGE[e.accessStatus]!} />
                      {e.ndaStatus !== "firmado" ? (
                        <span className="small c-lead">Esperando firma del NDA</span>
                      ) : can ? (
                        <>
                          {e.accessStatus === "pendiente" && (
                            <>
                              <ActionButton action={decideAccessAction.bind(null, id, e.id, "autorizado")} className="btn btn-sm" confirm={{ title: `Autorizar a ${orgName}`, body: "Podrá ver la identidad de la empresa, la información ampliada y los documentos según su permiso. Puede revocar el acceso después." }} confirmLabel="Autorizar">Autorizar</ActionButton>
                              <ActionButton action={decideAccessAction.bind(null, id, e.id, "rechazado")} className="btn btn-secondary btn-sm" confirm={{ title: `Rechazar a ${orgName}`, body: "El interesado recibirá un aviso. Podrá reconsiderarlo después." }} confirmLabel="Rechazar" danger {...reason}>Rechazar</ActionButton>
                            </>
                          )}
                          {e.accessStatus === "autorizado" && (
                            <ActionButton action={decideAccessAction.bind(null, id, e.id, "revocado")} className="btn btn-secondary btn-sm" danger confirm={{ title: `Revocar acceso de ${orgName}`, body: "Dejará de ver la sala de documentos de inmediato. Los enlaces abiertos dejarán de funcionar. El NDA sigue vigente." }} confirmLabel="Revocar acceso" {...reason}>Revocar acceso</ActionButton>
                          )}
                          {(e.accessStatus === "rechazado" || e.accessStatus === "revocado") && (
                            <ActionButton action={decideAccessAction.bind(null, id, e.id, "autorizado")} className="btn btn-sm" confirm={{ title: e.accessStatus === "rechazado" ? "Reconsiderar y autorizar" : "Restaurar acceso", body: "El interesado podrá volver a ver la información confidencial." }} confirmLabel="Autorizar">
                              {e.accessStatus === "rechazado" ? "Reconsiderar" : "Restaurar"}
                            </ActionButton>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "documentos" && (
        <div className="stack gap-24">
          {docRequests.length > 0 && (
            <section>
              <h2 className="section-title">Solicitudes de documentos restringidos</h2>
              <div className="card rows">
                {docRequests.map((r) => (
                  <div key={r.id} className="row">
                    <div className="row-main"><div className="fw6">{r.doc.originalName}</div><div className="small c-lead">{r.user.organization?.name ?? r.user.name} · {fmtDate(r.createdAt, false)}</div></div>
                    {can && (
                      <div className="row-actions">
                        <ActionButton action={decideDocRequestAction.bind(null, id, r.id, true)} className="btn btn-sm">Compartir (solo lectura)</ActionButton>
                        <ActionButton action={decideDocRequestAction.bind(null, id, r.id, false)} className="btn btn-secondary btn-sm" confirm={{ title: "Rechazar solicitud", body: "El interesado podrá volver a solicitarlo." }} confirmLabel="Rechazar" danger>Rechazar</ActionButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="section-title">Sala de documentos</h2>
            {l.documents.length === 0 ? (
              <Empty icon="folder_open" title="Sin documentos" text="Agregue documentos para los compradores autorizados." />
            ) : (
              <div className="card rows">
                {l.documents.map((d) => (
                  <div key={d.id} className="row">
                    <Icon name={d.kind === "teaser" ? "campaign" : "description"} />
                    <div className="row-main">
                      <div>{d.originalName}</div>
                      <div className="small c-lead">{d.kind === "teaser" ? "Teaser · visible para miembros" : d.category} · {fmtSize(d.size)} · {fmtDate(d.createdAt)}</div>
                    </div>
                    {d.kind === "documento" && can ? (
                      <DocPermForm action={updateDocumentAction.bind(null, id, d.id)} category={d.category} permission={d.permission} categories={DOC_CATEGORIES} />
                    ) : null}
                    <a className="btn btn-secondary btn-sm" href={`/api/documentos/${d.id}/abrir?modo=descargar`}><Icon name="download" /><span className="sr-only">Descargar</span></a>
                    {can && (d.kind === "documento" || editable) && (
                      <ActionButton action={deleteDocumentAction.bind(null, id, d.id)} className="btn btn-icon" icon="delete" danger confirm={{ title: "Eliminar documento", body: `«${d.originalName}» dejará de estar disponible para todos.` }} confirmLabel="Eliminar">
                        <span className="sr-only">Eliminar</span>
                      </ActionButton>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          {can && (
            <section className="card" style={{ padding: 20 }}>
              <UploadForm maxMb={MAX_FILE_MB} action={uploadDocumentAction.bind(null, id, "documento")} accept={ACCEPT_ATTR} categories={DOC_CATEGORIES} label="Agregar documento" hint="Visible solo para compradores autorizados, según el permiso elegido." />
            </section>
          )}
        </div>
      )}

      {tab === "preguntas" && (
        l.questions.length === 0 ? (
          <Empty icon="forum" title="Sin preguntas" text="Las preguntas de compradores autorizados aparecerán aquí." />
        ) : (
          <div className="card rows">
            {l.questions.map((q) => (
              <div key={q.id} style={{ padding: 20 }}>
                <div className="small c-lead">{q.asker.organization?.name ?? q.asker.name} · {fmtDate(q.createdAt)}</div>
                <div className="fw6 mt-4" style={{ fontSize: 16 }}>{q.body}</div>
                {q.answer ? (
                  <div className="panel-muted mt-12">{q.answer}<div className="small c-lead mt-8">Respondida el {fmtDate(q.answeredAt)}</div></div>
                ) : can ? (
                  <ActionForm action={answerQuestionAction.bind(null, id, q.id)} className="stack gap-12 mt-12">
                    <TextArea name="answer" label="Respuesta" rows={3} maxLength={4000} />
                    <div><Submit className="btn btn-sm" pendingText="Enviando…">Responder</Submit></div>
                  </ActionForm>
                ) : (
                  <span className="badge badge-warn mt-8"><Icon name="schedule" />Sin respuesta</span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "reuniones" && (
        meetings.length === 0 ? (
          <Empty icon="event" title="Sin solicitudes de reunión" text="Los compradores autorizados pueden proponer horarios desde su espacio privado." />
        ) : (
          <div className="card rows">
            {meetings.map((m) => {
              const slots = parseJson<string[]>(m.slots, []);
              return (
                <div key={m.id} style={{ padding: 20 }}>
                  <div className="hstack between gap-12" style={{ flexWrap: "wrap" }}>
                    <div>
                      <div className="fw6">{m.e.organizationName ?? m.e.user.name} · {{ video: "Videollamada", presencial: "Presencial", telefono: "Teléfono" }[m.format]}</div>
                      <div className="small c-lead">Solicitada el {fmtDate(m.createdAt)}{m.message ? ` · «${m.message}»` : ""}</div>
                    </div>
                    <Badge b={MEETING_BADGE[m.status]!} />
                  </div>
                  {m.status === "confirmada" && <p className="mt-8">Confirmada: {fmtDateTime(m.confirmedSlot)}</p>}
                  {m.status === "solicitada" && can && (
                    <ActionForm action={decideMeetingAction.bind(null, id, m.id)} className="stack gap-12 mt-12">
                      <Select name="slot" label="Horario a confirmar" placeholder="Seleccione…" options={slots.map((s) => [s, fmtDateTime(s)] as [string, string])} />
                      <TextArea name="response" label="Mensaje" optional rows={2} placeholder="Enlace de videollamada, dirección o propuesta de otra fecha." />
                      <div className="wrap-gap">
                        <Submit className="btn btn-sm" name="decision" value="confirmada" pendingText="Enviando…">Confirmar horario</Submit>
                        <Submit className="btn btn-secondary btn-sm" name="decision" value="rechazada" pendingText="Enviando…">No disponible / proponer otra fecha</Submit>
                      </div>
                    </ActionForm>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "equipo" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <section className="col-main" style={{ flex: "1 1 420px" }}>
            <h2 className="section-title">Colaboradores</h2>
            <p className="small c-lead mb-16" style={{ marginTop: -8 }}>Personas de su equipo o su asesor. «Gestor» decide accesos y edita; «Lector» solo consulta.</p>
            <div className="card rows mb-16">
              <div className="row"><div className="row-main"><div className="fw6">Dueño</div><div className="small c-lead">{l.ownerId === user.id ? "Usted" : "Otro miembro"}</div></div></div>
              {l.collaborators.map((c) => (
                <div key={c.id} className="row">
                  <div className="row-main"><div className="fw6">{c.user.name}</div><div className="small c-lead">{c.user.email} · {c.role}</div></div>
                  {ctx.isOwner && (
                    <ActionButton action={removeCollaboratorAction.bind(null, id, c.userId)} className="btn btn-secondary btn-sm" danger confirm={{ title: "Quitar colaborador", body: `${c.user.name} dejará de ver esta publicación.` }} confirmLabel="Quitar">Quitar</ActionButton>
                  )}
                </div>
              ))}
            </div>
            {ctx.isOwner && (
              <div className="card" style={{ padding: 20 }}>
                <ActionForm action={addCollaboratorAction.bind(null, id)} className="stack gap-12" resetOnSuccess>
                  <div className="grid-2">
                    <Field name="email" label="Correo del miembro" type="email" required />
                    <Select name="role" label="Rol" options={[["gestor", "Gestor"], ["lector", "Lector"]]} defaultValue="gestor" />
                  </div>
                  <div><Submit className="btn btn-secondary btn-sm" icon="person_add" pendingText="Agregando…">Agregar colaborador</Submit></div>
                </ActionForm>
              </div>
            )}
          </section>
          <section style={{ flex: "1 1 360px", minWidth: 0 }}>
            <h2 className="section-title">Organizaciones excluidas</h2>
            <p className="small c-lead mb-16" style={{ marginTop: -8 }}>No verán esta oportunidad en el catálogo (por ejemplo, competidores o clientes).</p>
            <div className="card rows mb-16">
              {l.exclusions.length === 0 && <div className="row c-lead">Sin exclusiones.</div>}
              {l.exclusions.map((x) => (
                <div key={x.id} className="row">
                  <div className="row-main">{x.organization.name}</div>
                  {can && <ActionButton action={removeExclusionAction.bind(null, id, x.organizationId)} className="btn btn-secondary btn-sm">Quitar</ActionButton>}
                </div>
              ))}
            </div>
            {can && (
              <div className="card" style={{ padding: 20 }}>
                <ActionForm action={addExclusionAction.bind(null, id)} className="stack gap-12" resetOnSuccess>
                  <Select name="organizationId" label="Organización" placeholder="Seleccione…" options={orgs.map((o) => [o.id, o.name] as [string, string])} />
                  <div><Submit className="btn btn-secondary btn-sm" icon="block" pendingText="Guardando…">Excluir</Submit></div>
                </ActionForm>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
