import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { INLINE_VIEWABLE, docMode, loadListing, toPublicListing } from "@/lib/access";
import { ACCESS_BADGE, DOC_CATEGORIES, DOC_PERM_BADGE, INTEREST_LEVELS, MEETING_BADGE } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtMoney, fmtPct, fmtSize, parseJson } from "@/lib/format";
import { Badge, Banner, Empty, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { ActionForm, Field, Select, Submit, TextArea } from "@/components/form";
import { askQuestionAction, cancelMeetingAction, requestDocAccessAction, requestMeetingAction, setInterestAction } from "@/app/actions/buyer";

export const metadata: Metadata = { title: "Espacio privado" };

const TABS = [
  ["resumen", "Resumen ampliado"],
  ["documentos", "Sala de documentos"],
  ["preguntas", "Preguntas"],
  ["reunion", "Solicitar reunión"],
] as const;

const DOC_ICON: Record<string, string> = {
  "application/pdf": "description",
  "image/jpeg": "image",
  "image/png": "image",
};

export default async function Espacio({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ tab?: string; cat?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await requireMember();
  const r = await loadListing(code, user);
  if (!r) notFound();
  const { listing: l, ctx } = r;
  const e = ctx.engagement;

  if (!e || e.accessStatus !== "autorizado" || e.ndaStatus !== "firmado") {
    if (!ctx.isTeam && !ctx.isAdmin) await audit(user.id, "access.denied", "listing", l.id, { listingId: l.id, meta: { area: "espacio" } });
    const msg = !e
      ? "Aún no ha solicitado información de esta oportunidad."
      : e.ndaStatus !== "firmado"
        ? "Falta firmar el NDA. Después, el vendedor decidirá si autoriza su acceso."
        : {
            pendiente: "Su acceso está pendiente de autorización por el vendedor.",
            rechazado: "El vendedor no autorizó el acceso a esta oportunidad.",
            revocado: "El acceso a este espacio fue revocado. Los documentos ya no están disponibles.",
            none: "Su acceso aún no fue evaluado.",
          }[e.accessStatus];
    return (
      <div className="page page-narrow">
        <Link href={`/oportunidades/${code}`} className="back"><Icon name="arrow_back" />{code}</Link>
        <Empty icon="lock" title="Espacio privado no disponible" text={ctx.isTeam ? "Usted gestiona esta oportunidad: administre documentos e interesados desde el panel del vendedor." : msg}>
          {ctx.isTeam ? <Link href={`/venta/${l.id}`} className="btn">Ir a la gestión</Link> : <Link href={`/oportunidades/${code}`} className="btn">Ver estado del proceso</Link>}
        </Empty>
      </div>
    );
  }

  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "resumen";
  const p = toPublicListing(l, true, true);
  const [docs, reqs, questions, meetings, decider] = await Promise.all([
    db.listingDocument.findMany({ where: { listingId: l.id, kind: "documento" }, orderBy: [{ category: "asc" }, { createdAt: "desc" }] }),
    db.documentAccessRequest.findMany({ where: { userId: user.id, document: { listingId: l.id } } }),
    db.question.findMany({ where: { listingId: l.id, askerId: user.id }, orderBy: { createdAt: "desc" } }),
    db.meetingRequest.findMany({ where: { engagementId: e.id }, orderBy: { createdAt: "desc" } }),
    e.accessDecidedById ? db.user.findUnique({ where: { id: e.accessDecidedById }, select: { isAdvisor: true, isAdmin: true } }) : null,
  ]);
  const reqOf = (id: string) => reqs.find((x) => x.documentId === id)?.status;
  const cat = DOC_CATEGORIES.includes(sp.cat as never) ? sp.cat! : "Todas";
  const shown = docs.filter((d) => cat === "Todas" || d.category === cat);
  const history = p.confidential?.history ?? [];
  const who = decider?.isAdmin ? "el equipo de administración" : decider?.isAdvisor ? "el asesor del vendedor" : "el vendedor";
  const tabHref = (k: string) => `/oportunidades/${code}/espacio${k === "resumen" ? "" : `?tab=${k}`}`;

  return (
    <div className="page">
      <Link href={`/oportunidades/${code}`} className="back"><Icon name="arrow_back" />{code}</Link>
      <div className="hstack between gap-16" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Espacio privado · {code}</div>
          <h1 className="h1-lg" style={{ margin: "12px 0 8px" }}>{l.legalName ?? p.title}</h1>
          <p className="lead">
            {l.isDemo && "Empresa ficticia · "}Acceso autorizado el {fmtDate(e.accessDecidedAt)} por {who}. Cada consulta queda registrada.
          </p>
        </div>
        <Badge b={ACCESS_BADGE.autorizado!} />
      </div>

      <nav className="tabs mt-32" aria-label="Secciones del espacio privado">
        {TABS.map(([k, label]) => (
          <Link key={k} href={tabHref(k)} className="tab" aria-current={tab === k ? "page" : undefined}>
            {label}
            {k === "preguntas" && questions.length > 0 && ` (${questions.length})`}
          </Link>
        ))}
      </nav>

      <div className="mt-32">
        {tab === "resumen" && (
          <div className="two-col" style={{ gap: 40 }}>
            <section className="col-main" style={{ flex: "1 1 420px" }}>
              <h2 className="section-title">Información de la empresa</h2>
              <dl className="kv card">
                <div><dt>Razón social</dt><dd>{l.legalName ?? "—"}{l.isDemo ? " (ficticia)" : ""}</dd></div>
                <div><dt>Ubicación</dt><dd>{l.city ?? "—"}</dd></div>
                <div><dt>Año de fundación</dt><dd className="num">{l.foundedYear ?? "—"}</dd></div>
                <div><dt>Colaboradores</dt><dd>{l.employees ?? "—"}</dd></div>
                <div><dt>Estructura accionaria</dt><dd>{l.ownership ?? "—"}</dd></div>
                <div><dt>Asesor del vendedor</dt><dd>{l.advisorName ?? "—"}</dd></div>
              </dl>
              {l.confidentialNotes && <p className="mt-16" style={{ lineHeight: 1.6 }}>{l.confidentialNotes}</p>}
            </section>
            <section style={{ flex: "1 1 420px", minWidth: 0 }}>
              <h2 className="section-title">Información financiera histórica</h2>
              {history.length ? (
                <div className="card" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead><tr><th>Año</th><th className="r">Ventas ({p.currency})</th><th className="r">EBITDA ({p.currency})</th><th className="r">Margen</th></tr></thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.year}>
                          <td className="num">{h.year}</td>
                          <td className="r num">{fmtMoney(h.sales, p.currency)}</td>
                          <td className="r num">{fmtMoney(h.ebitda, p.currency)}</td>
                          <td className="r num">{fmtPct(h.sales ? (h.ebitda / h.sales) * 100 : null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card row c-lead">El vendedor aún no cargó el histórico financiero.</div>
              )}
              <p className="small c-lead mt-12">Cifras declaradas por el vendedor{l.isDemo ? "; datos ficticios de demostración" : ""}. Montos en millones.</p>

              <h2 className="section-title mt-32">Su nivel de interés</h2>
              <p className="small c-lead mb-16" style={{ marginTop: -8 }}>El vendedor ve este indicador para dar seguimiento a los interesados.</p>
              <div className="wrap-gap">
                {Object.entries(INTEREST_LEVELS).map(([k, label]) => (
                  <ActionButton
                    key={k}
                    action={async () => {
                      "use server";
                      const fd = new FormData();
                      fd.set("level", k);
                      return setInterestAction(code, fd);
                    }}
                    className={"chip" + (e.interestLevel === k ? " chip-on" : "")}
                  >
                    {label}
                  </ActionButton>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "documentos" && (
          <>
            <div className="wrap-gap mb-24 small" style={{ gap: 20, color: "#444" }}>
              <span className="hstack gap-8"><Icon name="download" size={18} />Ver y descargar</span>
              <span className="hstack gap-8"><Icon name="visibility" size={18} />Solo lectura en visor protegido</span>
              <span className="hstack gap-8"><Icon name="lock" size={18} />Restringido: requiere solicitud específica</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
              <nav aria-label="Categorías" className="doc-cats">
                {["Todas", ...DOC_CATEGORIES].map((c) => {
                  const n = c === "Todas" ? docs.length : docs.filter((d) => d.category === c).length;
                  return (
                    <Link key={c} href={`/oportunidades/${code}/espacio?tab=documentos${c === "Todas" ? "" : `&cat=${encodeURIComponent(c)}`}`} aria-current={cat === c ? "page" : undefined}>
                      <span>{c}</span>
                      <span className="small num">{n}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="card grow" style={{ flex: "1 1 520px" }}>
                {shown.length === 0 ? (
                  <div style={{ padding: 24 }} className="c-lead">No hay documentos en esta categoría.</div>
                ) : (
                  <div className="rows">
                    {shown.map((d) => {
                      const mode = docMode(d, l, ctx, reqOf(d.id));
                      const badge = DOC_PERM_BADGE[mode === "lectura" && d.permission === "restringido" ? "lectura" : mode]!;
                      const viewable = INLINE_VIEWABLE.includes(d.mime);
                      return (
                        <div key={d.id} className="row">
                          <Icon name={DOC_ICON[d.mime] ?? "table_chart"} />
                          <div className="row-main">
                            <div style={{ fontSize: 16 }}>{d.originalName}</div>
                            <div className="small c-lead">{d.category} · {fmtSize(d.size)} · {fmtDate(d.createdAt)}</div>
                          </div>
                          <div className="row-actions">
                            <Badge b={badge} />
                            {mode === "descarga" && (
                              <a className="btn btn-secondary btn-sm" href={`/api/documentos/${d.id}/abrir?modo=descargar`}><Icon name="download" />Descargar</a>
                            )}
                            {(mode === "descarga" || mode === "lectura") && viewable && (
                              <a className="btn btn-secondary btn-sm" href={`/api/documentos/${d.id}/abrir?modo=ver`} target="_blank" rel="noopener"><Icon name="visibility" />Ver</a>
                            )}
                            {mode === "lectura" && !viewable && (
                              <span className="small c-lead" title="El visor protegido solo admite PDF e imágenes">Sin vista previa · solicite descarga al vendedor</span>
                            )}
                            {(mode === "restringido" || mode === "rechazado") && (
                              <ActionButton action={requestDocAccessAction.bind(null, code, d.id)} icon="key">{mode === "rechazado" ? "Volver a solicitar" : "Solicitar acceso"}</ActionButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(26,26,26,.1)" }} className="small c-lead">
                  Los PDF se entregan con marca de agua con su correo, organización y fecha. Cada apertura y descarga queda registrada. Los enlaces caducan a los 5 minutos.
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "preguntas" && (
          <div className="two-col">
            <div className="col-main">
              {questions.length === 0 ? (
                <Empty icon="forum" title="Aún no ha hecho preguntas" text="Las preguntas llegan al vendedor o a su asesor. Solo usted ve sus preguntas y respuestas." />
              ) : (
                <div className="card rows">
                  {questions.map((q) => (
                    <div key={q.id} style={{ padding: 20 }}>
                      <div className="hstack between gap-12" style={{ flexWrap: "wrap" }}>
                        <div className="fw6" style={{ fontSize: 16 }}>{q.body}</div>
                        {q.answer ? <span className="badge badge-ok"><Icon name="check" />Respondida</span> : <span className="badge badge-warn"><Icon name="schedule" />Sin respuesta</span>}
                      </div>
                      <div className="small c-lead mt-4">Enviada el {fmtDate(q.createdAt)}</div>
                      {q.answer && (
                        <div className="panel-muted mt-12" style={{ fontSize: 15, lineHeight: 1.6 }}>
                          {q.answer}
                          <div className="small c-lead mt-8">Respondida el {fmtDate(q.answeredAt)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <aside className="col-side">
              <div className="card" style={{ padding: 24 }}>
                <h2 className="h2 mb-16" style={{ fontSize: 18 }}>Nueva pregunta</h2>
                <ActionForm action={askQuestionAction.bind(null, code)} className="stack gap-16" resetOnSuccess>
                  <TextArea name="body" label="Pregunta" required rows={5} maxLength={2000} placeholder="Escriba una pregunta concreta sobre la operación." />
                  <Submit pendingText="Enviando…">Enviar pregunta</Submit>
                </ActionForm>
              </div>
            </aside>
          </div>
        )}

        {tab === "reunion" && (
          <div className="two-col">
            <div className="col-main">
              {meetings.length === 0 ? (
                <Empty icon="event" title="Sin solicitudes de reunión" text="Proponga hasta tres horarios. El vendedor confirmará uno o le propondrá otra fecha." />
              ) : (
                <div className="card rows">
                  {meetings.map((m) => (
                    <div key={m.id} className="row">
                      <div className="row-main">
                        <div className="fw6">{{ video: "Videollamada", presencial: "Reunión presencial", telefono: "Llamada telefónica" }[m.format]}</div>
                        <div className="small c-lead mt-4">
                          {m.status === "confirmada" && m.confirmedSlot ? `Confirmada: ${fmtDateTime(m.confirmedSlot)}` : `Horarios propuestos: ${parseJson<string[]>(m.slots, []).map((s) => fmtDateTime(s)).join(" · ")}`}
                        </div>
                        {m.response && <div className="small mt-4">Respuesta: {m.response}</div>}
                      </div>
                      <div className="row-actions">
                        <Badge b={MEETING_BADGE[m.status]!} />
                        {(m.status === "solicitada" || m.status === "confirmada") && (
                          <ActionButton action={cancelMeetingAction.bind(null, code, m.id)} confirm={{ title: "Cancelar la reunión", body: "El vendedor recibirá el aviso de cancelación." }} confirmLabel="Cancelar reunión" danger>
                            Cancelar
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="small c-lead mt-12">La invitación de calendario y el enlace de videollamada se envían por fuera de la plataforma: la integración de calendario aún no está configurada.</p>
            </div>
            <aside className="col-side">
              <div className="card" style={{ padding: 24 }}>
                <h2 className="h2 mb-16" style={{ fontSize: 18 }}>Solicitar reunión</h2>
                <ActionForm action={requestMeetingAction.bind(null, code)} className="stack gap-16" resetOnSuccess>
                  <Field name="slot1" label="Horario propuesto 1" type="datetime-local" required />
                  <Field name="slot2" label="Horario propuesto 2" type="datetime-local" optional />
                  <Field name="slot3" label="Horario propuesto 3" type="datetime-local" optional />
                  <Select name="format" label="Formato" options={[["video", "Videollamada"], ["presencial", "Presencial"], ["telefono", "Teléfono"]]} defaultValue="video" />
                  <TextArea name="message" label="Mensaje" optional rows={3} maxLength={1000} />
                  <Submit pendingText="Enviando…">Enviar solicitud</Submit>
                </ActionForm>
              </div>
            </aside>
          </div>
        )}
      </div>
      {l.status !== "publicada" && <div className="mt-24"><Banner tone="info">La publicación ya no aparece en el catálogo, pero su acceso autorizado se mantiene.</Banner></div>}
    </div>
  );
}
