"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/action";

type Props = {
  code: string;
  sections: [string, string][];
  version: string;
  defaults: { name: string; title: string; org: string; email: string };
  signature: { mode: "registro_interno" | "proveedor"; label: string; configured: boolean };
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
};

const LABELS = ["Revisar acuerdo", "Datos del firmante", "Firma", "Estado"];
const STEP_OF: Record<string, number> = { read: 1, signerName: 2, signerTitle: 2, signerOrg: 2, signerEmail: 2, representation: 2, clientName: 2, typedName: 3, consent: 3 };

function Err({ m }: { m?: string }) {
  return m ? <div className="field-error"><span aria-hidden="true" className="ms">error</span>{m}</div> : null;
}

export function NdaFlow({ code, sections, version, defaults, signature, action }: Props) {
  const [state, run, pending] = useActionState(action, {});
  const [step, setStep] = useState(1);
  const [v, setV] = useState({ read: false, signerName: defaults.name, signerTitle: defaults.title, signerOrg: defaults.org, signerEmail: defaults.email, representation: "organizacion", clientName: "", typedName: "", consent: false });
  const [local, setLocal] = useState<Record<string, string>>({});
  const errs = { ...local, ...(state.fields ?? {}) };

  useEffect(() => {
    if (state.fields) {
      const first = Math.min(...Object.keys(state.fields).map((k) => STEP_OF[k] ?? 3));
      setStep(first);
    }
  }, [state]);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setV((s) => ({ ...s, [k]: val }));
  };

  function next() {
    const f: Record<string, string> = {};
    if (step === 1 && !v.read) f.read = "Confirme que leyó el acuerdo completo.";
    if (step === 2) {
      if (!v.signerName.trim()) f.signerName = "Ingrese el nombre del firmante.";
      if (!v.signerTitle.trim()) f.signerTitle = "Indique el cargo del firmante.";
      if (!v.signerOrg.trim()) f.signerOrg = "Indique la organización.";
      if (!/^\S+@\S+\.\S+$/.test(v.signerEmail)) f.signerEmail = "Ingrese un correo válido.";
      if (v.representation === "tercero" && !v.clientName.trim()) f.clientName = "Indique a quién representa.";
    }
    setLocal(f);
    if (!Object.keys(f).length) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const reps: [string, string][] = [["propia", "En nombre propio"], ["organizacion", "En representación de mi organización"], ["tercero", "Como asesor de un tercero"]];

  return (
    <>
      <ol className="steps-h mb-24" aria-label="Pasos del NDA">
        {LABELS.map((l, i) => {
          const k = i + 1;
          const cls = k < step ? "done" : k === step ? "cur" : "";
          return (
            <li key={l} className={cls} aria-current={k === step ? "step" : undefined}>
              <span className="step-dot">{k < step ? <span aria-hidden="true" className="ms">check</span> : k}</span>
              <span>{l}</span>
            </li>
          );
        })}
      </ol>
      <form onSubmit={(e) => { e.preventDefault(); if (pending) return; const fd = new FormData(e.currentTarget); startTransition(() => run(fd)); }} className="card card-pad" noValidate>
        {state.error && <div className="form-banner mb-16" role="alert"><span aria-hidden="true" className="ms">error</span><div>{state.error}</div></div>}
        {/* Todos los campos permanecen en el formulario; el servidor valida de nuevo. */}
        <div hidden={step !== 1}>
          <div className="hstack between gap-12 mb-16" style={{ flexWrap: "wrap" }}>
            <h2 className="h2">Acuerdo de confidencialidad unilateral</h2>
            <span className="small c-lead">Texto de ejemplo · versión {version} · pendiente de revisión jurídica</span>
          </div>
          <div tabIndex={0} aria-label="Texto del acuerdo" style={{ maxHeight: 340, overflow: "auto", border: "1px solid rgba(26,26,26,.12)", background: "#FAFAFA", padding: "20px 24px", fontSize: 15, lineHeight: 1.7 }}>
            {sections.map(([t, b], i) => (
              <p key={t} style={{ margin: "0 0 12px" }}><strong>{i + 1}. {t}.</strong> {b}</p>
            ))}
          </div>
          <label className="check mt-16">
            <input type="checkbox" name="read" checked={v.read} onChange={set("read")} aria-invalid={!!errs.read || undefined} />
            <span>He leído el acuerdo completo y deseo continuar.</span>
          </label>
          <Err m={errs.read} />
        </div>

        <div hidden={step !== 2}>
          <h2 className="h2 mb-16">Datos del firmante</h2>
          <div className="grid-2">
            {([["signerName", "Nombre completo", "name"], ["signerTitle", "Cargo", "organization-title"], ["signerOrg", "Organización", "organization"], ["signerEmail", "Correo", "email"]] as const).map(([k, l, ac]) => (
              <div className="field" key={k}>
                <label htmlFor={k}>{l} *</label>
                <input id={k} name={k} className="input" value={v[k]} onChange={set(k)} autoComplete={ac} aria-invalid={!!errs[k] || undefined} />
                <Err m={errs[k]} />
              </div>
            ))}
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: "24px 0 0" }}>
            <legend className="field-label" style={{ marginBottom: 10 }}>Firma *</legend>
            <div className="chips">
              {reps.map(([k, l]) => (
                <label key={k} className="chip">
                  <input type="radio" name="representation" value={k} checked={v.representation === k} onChange={set("representation")} />
                  {l}
                </label>
              ))}
            </div>
            <Err m={errs.representation} />
          </fieldset>
          {v.representation === "tercero" && (
            <div className="field mt-16">
              <label htmlFor="clientName">Cliente representado *</label>
              <input id="clientName" name="clientName" className="input" value={v.clientName} onChange={set("clientName")} placeholder="Puede ser una descripción genérica, p. ej. «Fondo de capital privado»" aria-invalid={!!errs.clientName || undefined} />
              <Err m={errs.clientName} />
            </div>
          )}
        </div>

        <div hidden={step !== 3}>
          {signature.mode === "registro_interno" ? (
            <>
              <h2 className="h2 mb-8">Aceptación del acuerdo</h2>
              <div className="form-banner warn mb-24" role="note">
                <span aria-hidden="true" className="ms">info</span>
                <div>
                  <strong>Sin proveedor de firma electrónica configurado.</strong> Al continuar, la plataforma registrará su aceptación con
                  nombre, cargo, organización, fecha y hora, dirección IP, navegador y la versión exacta del texto. Este registro <strong>no es
                  una firma electrónica avanzada ni certificada</strong>; el valor jurídico debe confirmarlo su área legal.
                </div>
              </div>
              <div className="field">
                <label htmlFor="typedName">Escriba su nombre completo para confirmar *</label>
                <input id="typedName" name="typedName" className="input" value={v.typedName} onChange={set("typedName")} placeholder={v.signerName} aria-invalid={!!errs.typedName || undefined} style={{ fontSize: 20 }} />
                <Err m={errs.typedName} />
              </div>
              <label className="check mt-16">
                <input type="checkbox" name="consent" checked={v.consent} onChange={set("consent")} aria-invalid={!!errs.consent || undefined} />
                <span>Acepto el acuerdo de confidencialidad de {code} en {v.representation === "propia" ? "nombre propio" : v.representation === "tercero" ? `representación de ${v.clientName || "mi cliente"}` : `representación de ${v.signerOrg}`}.</span>
              </label>
              <Err m={errs.consent} />
            </>
          ) : (
            <>
              <h2 className="h2 mb-8">Firma electrónica</h2>
              <p className="c-lead">{signature.label}. Le enviaremos el documento al correo {v.signerEmail} para firmarlo con el proveedor.</p>
            </>
          )}
          <p className="small c-lead mt-16">Firmar el NDA no concede acceso automático: el vendedor o su asesor decidirá después si autoriza su acceso y a qué documentos.</p>
        </div>

        <div className="form-actions">
          {step === 1 ? (
            <Link prefetch={false} href={`/oportunidades/${code}`} className="btn btn-secondary btn-lg">Volver a la oportunidad</Link>
          ) : (
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep(step - 1)}>Atrás</button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-lg" onClick={next}>Continuar</button>
          ) : (
            <button className="btn btn-lg" disabled={pending || (signature.mode === "proveedor" && !signature.configured)} aria-busy={pending || undefined}>
              {pending && <span className="spinner" />}
              {signature.mode === "registro_interno" ? "Registrar aceptación del NDA" : "Enviar a firma electrónica"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
