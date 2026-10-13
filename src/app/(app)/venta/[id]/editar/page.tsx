import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCtx, toPublicListing } from "@/lib/access";
import { CURRENCIES, DEAL_TYPES, DOC_CATEGORIES, DOC_PERM_BADGE, EMPLOYEE_RANGES, LISTING_BADGE, REGIONS, SECTORS } from "@/lib/domain";
import { fmtMoney, fmtPct, fmtSize, parseJson } from "@/lib/format";
import { ACCEPT_ATTR, ACCEPTED_LABEL } from "@/lib/files";
import { identityLeaks } from "@/lib/anonymity";
import { ActionForm, Check, Field, Select, Submit, TextArea } from "@/components/form";
import { ActionButton } from "@/components/confirm";
import { UploadForm } from "@/components/upload";
import { DocPermForm } from "@/components/doc-perm";
import { OpportunityCard } from "@/components/opportunity";
import { Badge, Banner, Icon } from "@/components/ui";
import { FieldErrorFor } from "@/components/field-error";
import { deleteDocumentAction, deleteDraftAction, saveStepAction, submitListingAction, updateDocumentAction, uploadDocumentAction } from "@/app/actions/seller";

export const metadata: Metadata = { title: "Publicar una empresa" };

const LABELS = ["Empresa", "Operación", "Finanzas", "Teaser y documentos", "Vista previa", "Enviar"];

function StepActions({ step, id }: { step: number; id: string }) {
  return (
    <div className="form-actions">
      {step > 1 ? <Link href={`/venta/${id}/editar?paso=${step - 1}`} className="btn btn-secondary btn-lg">Atrás</Link> : <Link href="/venta" className="btn btn-secondary btn-lg">Salir</Link>}
      <div className="wrap-gap">
        <Submit className="btn btn-secondary btn-lg" name="intent" value="guardar" icon="save" pendingText="Guardando…">Guardar borrador</Submit>
        <Submit className="btn btn-lg" name="intent" value="continuar" pendingText="Validando…">Continuar</Submit>
      </div>
    </div>
  );
}

export default async function Editar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string }> }) {
  const { id } = await params;
  const user = await requireMember();
  const l = await db.listing.findUnique({ where: { id }, include: { collaborators: { select: { userId: true, role: true } }, documents: { orderBy: { createdAt: "asc" } } } });
  if (!l) notFound();
  const ctx = buildCtx(user, l, null);
  if (!ctx.canManage) notFound();
  if (l.status !== "borrador" && l.status !== "cambios") redirect(`/venta/${id}`);
  const step = Math.min(6, Math.max(1, Number((await searchParams).paso) || 1));
  if (step > l.step) redirect(`/venta/${id}/editar?paso=${l.step}`);

  const teaser = l.documents.find((d) => d.kind === "teaser");
  const docs = l.documents.filter((d) => d.kind === "documento");
  const hist = parseJson<{ year: number; sales: number; ebitda: number }[]>(l.financialHistory, []).filter((h) => h.year !== l.fiscalYear);
  const cur = l.currency;
  const margin = l.sales && l.ebitda != null ? (l.ebitda / l.sales) * 100 : null;
  const pub = toPublicListing(l, false, !!teaser);
  const checks: [boolean, string, string][] = [
    [!!teaser, "Teaser cargado", "Recomendado: mejora la tasa de solicitudes."],
    [!!l.title && !identityLeaks(l.legalName, [l.title, l.summary]), "Título y descripción sin datos identificables", "Revise el paso 2."],
    [l.sales != null && l.ebitda != null, "Datos financieros completos", "Revise el paso 3."],
    [docs.length > 0, "Al menos un documento para compradores autorizados", "Recomendado. Puede agregarlos después."],
    [!!l.legalName && !!l.sector && !!l.region, "Datos de la empresa completos", "Revise el paso 1."],
  ];

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{l.code} · {l.status === "cambios" ? "Cambios solicitados" : "Nueva publicación"}</div>
          <h1 className="h1-lg" style={{ marginTop: 12 }}>Publicar una empresa</h1>
        </div>
        <div className="wrap-gap">
          <Badge b={LISTING_BADGE[l.status]!} />
          {l.status === "borrador" && ctx.isOwner && (
            <ActionButton action={deleteDraftAction.bind(null, id)} className="btn btn-danger btn-sm" icon="delete" danger confirm={{ title: "Eliminar borrador", body: "Se eliminarán los datos y archivos cargados. Esta acción no se puede deshacer." }} confirmLabel="Eliminar borrador">
              Eliminar borrador
            </ActionButton>
          )}
        </div>
      </div>

      {l.status === "cambios" && l.reviewNote && (
        <div className="mb-24"><Banner tone="warn" icon="edit_note"><strong>Cambios solicitados por el equipo:</strong> {l.reviewNote}</Banner></div>
      )}

      <ol className="steps-h mb-24 desktop-only" aria-label="Pasos de la publicación">
        {LABELS.map((lab, i) => {
          const k = i + 1;
          const cls = k < step ? "done" : k === step ? "cur" : "";
          const inner = (<><span className="step-dot">{k < step ? <span aria-hidden="true" className="ms">check</span> : k}</span><span>{lab}</span></>);
          return (
            <li key={lab} className={cls} aria-current={k === step ? "step" : undefined}>
              {k <= l.step && k !== step ? <Link href={`/venta/${id}/editar?paso=${k}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>
      <div className="mobile-only mb-16 small c-lead">Paso {step} de 6 · {LABELS[step - 1]}</div>

      <div className="card card-pad">
        {step === 1 && (
          <ActionForm action={saveStepAction.bind(null, id, 1)}>
            <h2 className="h2">Datos básicos de la empresa</h2>
            <p className="c-lead mt-8 mb-24">Los campos marcados con <Icon name="lock" size={15} /> son confidenciales y no se muestran en el catálogo.</p>
            <div className="grid-3">
              <Field name="legalName" icon="lock" label="Nombre legal de la empresa" required defaultValue={l.legalName ?? ""} />
              <Select name="relationship" label="Su relación con la empresa" options={[["propietario", "Propietario/a o accionista"], ["directivo", "Directivo/a"], ["asesor", "Asesor representante"]]} defaultValue={l.relationship} />
              <Select name="sector" label="Sector" required placeholder="Seleccione…" options={[...SECTORS]} defaultValue={l.sector ?? ""} />
              <Select name="region" label="Región (visible de forma general)" required placeholder="Seleccione…" options={[...REGIONS]} defaultValue={l.region ?? ""} />
              <Field name="city" icon="lock" label="Ciudad" optional defaultValue={l.city ?? ""} />
              <Field name="yearsOperating" label="Años de operación" inputMode="numeric" defaultValue={l.yearsOperating?.toString() ?? ""} />
              <Select name="employees" label="Colaboradores" placeholder="Seleccione…" options={[...EMPLOYEE_RANGES]} defaultValue={l.employees ?? ""} />
              <Field name="foundedYear" icon="lock" label="Año de fundación" optional inputMode="numeric" defaultValue={l.foundedYear?.toString() ?? ""} />
              <Field name="ownership" icon="lock" label="Estructura accionaria" optional defaultValue={l.ownership ?? ""} />
              <Field name="advisorName" icon="lock" label="Asesor del vendedor" optional defaultValue={l.advisorName ?? ""} />
            </div>
            <StepActions step={1} id={id} />
          </ActionForm>
        )}

        {step === 2 && (
          <ActionForm action={saveStepAction.bind(null, id, 2)}>
            <h2 className="h2">Operación y presentación anónima</h2>
            <p className="c-lead mt-8 mb-24">Esto es lo que verán los miembros en el catálogo. No incluya nombres, marcas, direcciones ni datos que identifiquen a la empresa.</p>
            <div className="stack gap-20" style={{ gap: 20 }}>
              <div className="grid-2">
                <Select name="dealType" label="Tipo de operación" required placeholder="Seleccione…" options={[...DEAL_TYPES]} defaultValue={l.dealType ?? ""} />
                <Select name="currency" label="Moneda de las cifras" required options={[...CURRENCIES]} defaultValue={l.currency} hint="Todas las cifras de la publicación se expresan en esta moneda." />
              </div>
              <Field name="title" label="Título anónimo" required maxLength={140} defaultValue={l.title ?? ""} placeholder="Ej.: Fabricante de empaques flexibles para consumo masivo" />
              <TextArea name="summary" label="Descripción breve" required rows={4} maxLength={1200} defaultValue={l.summary ?? ""} />
              <TextArea name="highlights" label="Puntos destacados" optional rows={4} hint="Uno por línea, máximo 6." defaultValue={parseJson<string[]>(l.highlights, []).join("\n")} />
              <div>
                <div className="field-label mb-8">Precio indicativo (millones de {cur})</div>
                <div className="grid-3" style={{ alignItems: "end" }}>
                  <Field name="priceMin" label="Mínimo" inputMode="decimal" defaultValue={l.priceMin?.toString() ?? ""} />
                  <Field name="priceMax" label="Máximo" inputMode="decimal" defaultValue={l.priceMax?.toString() ?? ""} />
                  <Check name="negotiable" defaultChecked={l.negotiable}>A negociar (sin rango)</Check>
                </div>
                <PriceError />
              </div>
            </div>
            <StepActions step={2} id={id} />
          </ActionForm>
        )}

        {step === 3 && (
          <ActionForm action={saveStepAction.bind(null, id, 3)}>
            <h2 className="h2">Datos financieros</h2>
            <p className="c-lead mt-8 mb-24">En millones de {cur}. El EBITDA es un monto; el margen EBITDA (EBITDA ÷ ventas) se calcula automáticamente. Elija qué cifras ven los miembros en el catálogo.</p>
            <div className="grid-4">
              <Field name="fiscalYear" label="Año fiscal" inputMode="numeric" defaultValue={(l.fiscalYear ?? new Date().getFullYear() - 1).toString()} />
              <Field name="sales" label={`Ventas anuales (${cur})`} required inputMode="decimal" defaultValue={l.sales?.toString() ?? ""} />
              <Field name="ebitda" label={`EBITDA (monto, ${cur})`} required inputMode="decimal" defaultValue={l.ebitda?.toString() ?? ""} hint="Puede ser negativo." />
              <div className="field">
                <span className="field-label">Margen EBITDA (calculado)</span>
                <div className="input num" style={{ display: "flex", alignItems: "center", background: "#F3F3F3" }}>{fmtPct(margin)}</div>
                <span className="field-hint">Se recalcula al guardar.</span>
              </div>
            </div>
            <div className="label-caps mt-32 mb-8">Histórico (confidencial, opcional)</div>
            {[0, 1].map((i) => (
              <div key={i} className="grid-3 mb-8">
                <Field name={`h${i + 1}y`} label="Año" inputMode="numeric" defaultValue={hist[i]?.year.toString() ?? ""} />
                <Field name={`h${i + 1}s`} label={`Ventas (${cur})`} inputMode="decimal" defaultValue={hist[i]?.sales.toString() ?? ""} />
                <Field name={`h${i + 1}e`} label={`EBITDA (${cur})`} inputMode="decimal" defaultValue={hist[i]?.ebitda.toString() ?? ""} />
              </div>
            ))}
            <HistError />
            <div className="label-caps mt-32 mb-8">Visibilidad de cada cifra</div>
            <div className="card rows">
              {([
                ["visSales", "Ventas anuales", fmtMoney(l.sales, cur), l.visSales],
                ["visEbitda", "EBITDA", fmtMoney(l.ebitda, cur), l.visEbitda],
                ["visMargin", "Margen EBITDA", fmtPct(margin), l.visMargin],
                ["visPrice", "Precio indicativo", l.negotiable ? "A negociar" : l.priceMin != null ? `${fmtMoney(l.priceMin, cur)} – ${fmtMoney(l.priceMax, cur)}` : "—", l.visPrice],
              ] as const).map(([k, label, val, v]) => (
                <div key={k} className="row" style={{ padding: "14px 16px" }}>
                  <div className="row-main"><div className="fw6">{label}</div><div className="small c-lead num">{val}</div></div>
                  <div className="seg" role="radiogroup" aria-label={`Visibilidad de ${label}`}>
                    <label><input type="radio" name={k} value="miembros" defaultChecked={v === "miembros"} />Miembros aprobados</label>
                    <label><input type="radio" name={k} value="autorizados" defaultChecked={v === "autorizados"} />Solo autorizados</label>
                  </div>
                </div>
              ))}
            </div>
            <p className="small c-lead mt-12">Si oculta el EBITDA pero muestra ventas y margen, el margen también se ocultará: con ambos se podría calcular el EBITDA.</p>
            <div className="mt-24">
              <TextArea name="confidentialNotes" label="Notas para compradores autorizados" optional rows={3} defaultValue={l.confidentialNotes ?? ""} />
            </div>
            <StepActions step={3} id={id} />
          </ActionForm>
        )}

        {step === 4 && (
          <>
            <h2 className="h2">Teaser y documentos</h2>
            <p className="c-lead mt-8 mb-24">{ACCEPTED_LABEL} por archivo. Los archivos se guardan fuera del sitio público y solo se entregan con enlaces temporales a usuarios con permiso.</p>
            <div className="label-caps mb-8">Teaser no confidencial · visible para miembros aprobados</div>
            {teaser ? (
              <div className="card row mb-16">
                <Icon name="description" />
                <div className="row-main"><div className="fw6">{teaser.originalName}</div><div className="small c-lead">{fmtSize(teaser.size)} · se mostrará como «Teaser {l.code}.pdf», sin metadatos</div></div>
                <a className="btn btn-secondary btn-sm" href={`/api/documentos/${teaser.id}/abrir?modo=ver`} target="_blank" rel="noopener"><Icon name="visibility" />Ver</a>
                <ActionButton action={deleteDocumentAction.bind(null, id, teaser.id)} className="btn btn-icon" icon="delete" danger confirm={{ title: "Quitar teaser", body: "El archivo se eliminará." }} confirmLabel="Quitar">
                  <span className="sr-only">Quitar teaser</span>
                </ActionButton>
              </div>
            ) : (
              <UploadForm action={uploadDocumentAction.bind(null, id, "teaser")} accept=".pdf" teaser label="Cargar teaser (PDF)" hint="Sin nombre, logotipo, fotografías identificables ni direcciones." />
            )}
            <div className="label-caps mt-32 mb-8">Documentos para la sala de documentos · solo compradores autorizados</div>
            {docs.length > 0 && (
              <div className="card rows mb-16">
                {docs.map((d) => (
                  <div key={d.id} className="row">
                    <div className="row-main"><div>{d.originalName}</div><div className="small c-lead">{fmtSize(d.size)}</div></div>
                    <DocPermForm action={updateDocumentAction.bind(null, id, d.id)} category={d.category} permission={d.permission} categories={DOC_CATEGORIES} />
                    <ActionButton action={deleteDocumentAction.bind(null, id, d.id)} className="btn btn-icon" icon="delete" danger confirm={{ title: "Eliminar documento", body: `Se eliminará «${d.originalName}».` }} confirmLabel="Eliminar">
                      <span className="sr-only">Eliminar {d.originalName}</span>
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
            <div className="card" style={{ padding: 20 }}>
              <UploadForm action={uploadDocumentAction.bind(null, id, "documento")} accept={ACCEPT_ATTR} categories={DOC_CATEGORIES} label="Agregar archivo" hint="Estados financieros, memorándum, contratos… Defina categoría y permiso." />
            </div>
            <div className="form-actions">
              <Link href={`/venta/${id}/editar?paso=3`} className="btn btn-secondary btn-lg">Atrás</Link>
              <form action={advance.bind(null, id, 5)}>
                <button className="btn btn-lg">Continuar</button>
              </form>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="h2">Vista previa</h2>
            <p className="c-lead mt-8 mb-24">Así verán su publicación los miembros que aún no tienen autorización. La identidad y los documentos confidenciales no aparecen.</p>
            <OpportunityCard o={{ ...pub, nda: "none", ndaMethod: null, access: "none", saved: false, isOwn: false }} isAdmin />
            <div className="label-caps mt-32 mb-8">Revisión antes de enviar</div>
            <ul className="card rows" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {checks.map(([ok, label, hint]) => (
                <li key={label} className="row" style={{ padding: "12px 16px" }}>
                  <span aria-hidden="true" className="ms" style={{ color: ok ? "var(--ok-fg)" : "var(--warn-fg)" }}>{ok ? "check_circle" : "warning"}</span>
                  <span className="grow">{label}</span>
                  {!ok && <span className="small c-lead">{hint}</span>}
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <Link href={`/venta/${id}/editar?paso=4`} className="btn btn-secondary btn-lg">Atrás</Link>
              <form action={advance.bind(null, id, 6)}>
                <button className="btn btn-lg">Continuar</button>
              </form>
            </div>
          </>
        )}

        {step === 6 && (
          <ActionForm action={submitListingAction.bind(null, id)}>
            <h2 className="h2">Enviar a revisión</h2>
            <p className="c-lead mt-8 mb-24">Nuestro equipo revisa que la publicación no revele la identidad y que la información sea coherente. Tiempo habitual: 2 a 3 días hábiles. Recibirá una notificación con el resultado.</p>
            <div className="panel-muted mb-24">
              <div className="label-caps mb-8">Solo verán el equipo y los compradores que usted autorice</div>
              <div style={{ fontSize: 15 }}>Nombre: {l.legalName ?? "—"}{l.city ? ` · ${l.city}` : ""}</div>
              {docs.map((d) => <div key={d.id} className="small mt-4">{d.originalName} · {DOC_PERM_BADGE[d.permission]?.label}</div>)}
            </div>
            <Check name="confirm">Confirmo que cuento con autorización para compartir esta información y que los datos son correctos según mi conocimiento.</Check>
            <div className="form-actions">
              <Link href={`/venta/${id}/editar?paso=5`} className="btn btn-secondary btn-lg">Atrás</Link>
              <Submit className="btn btn-lg" icon="send" pendingText="Enviando…">Enviar a revisión</Submit>
            </div>
          </ActionForm>
        )}
      </div>
    </div>
  );
}

async function advance(id: string, to: number) {
  "use server";
  const user = await requireMember();
  const l = await db.listing.findUnique({ where: { id }, include: { collaborators: { select: { userId: true, role: true } } } });
  if (!l || !buildCtx(user, l, null).canManage) return;
  if (l.step < to) await db.listing.update({ where: { id }, data: { step: to } });
  redirect(`/venta/${id}/editar?paso=${to}`);
}

function PriceError() {
  return <FieldErrorFor name="price" />;
}
function HistError() {
  return (
    <>
      <FieldErrorFor name="h1" />
      <FieldErrorFor name="h2" />
    </>
  );
}
