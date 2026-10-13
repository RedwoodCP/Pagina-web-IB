"use client";

import { useActionState } from "react";
import { checkRequestStatusAction, type StatusResult } from "@/app/actions/auth";
import { MEMBERSHIP_BADGE } from "@/lib/domain";
import { fmtDate } from "@/lib/format";

export function StatusForm() {
  const [s, run, pending] = useActionState<StatusResult, FormData>(checkRequestStatusAction, {});
  const b = s.status ? MEMBERSHIP_BADGE[s.status] : null;
  const text: Record<string, string> = {
    pendiente: "Nuestro equipo está revisando su solicitud. Le escribiremos por correo con la respuesta.",
    aprobada: "Su solicitud fue aprobada. Le enviamos una invitación personal por correo con vigencia de 14 días.",
    rechazada: "En esta ocasión no fue posible aprobar la solicitud. Si cree que se trata de un error, escriba a nuestro equipo.",
  };
  return (
    <>
      <form action={run} className="card card-pad stack gap-20" noValidate style={{ gap: 20 }}>
        {s.error && (
          <div className="form-banner" role="alert"><span className="ms">error</span><div>{s.error}</div></div>
        )}
        <div className="field">
          <label htmlFor="e">Correo de la solicitud *</label>
          <input id="e" name="email" type="email" className="input" defaultValue={s.values?.email} aria-invalid={!!s.fields?.email || undefined} autoComplete="email" />
          {s.fields?.email && <div className="field-error"><span className="ms">error</span>{s.fields.email}</div>}
        </div>
        <div className="field">
          <label htmlFor="r">Folio *</label>
          <input id="r" name="reference" className="input" placeholder="SOL-XXXXX" defaultValue={s.values?.reference} aria-invalid={!!s.fields?.reference || undefined} style={{ textTransform: "uppercase" }} />
          {s.fields?.reference && <div className="field-error"><span className="ms">error</span>{s.fields.reference}</div>}
        </div>
        <div>
          <button className="btn btn-lg" disabled={pending}>{pending && <span className="spinner" />}Consultar</button>
        </div>
      </form>
      {s.ok && b && (
        <div className="card mt-24" style={{ padding: 24 }} role="status">
          <div className="hstack between gap-12" style={{ flexWrap: "wrap" }}>
            <div>
              <div className="label-caps">Solicitud {s.reference}</div>
              <div className="small c-lead mt-4">Enviada el {fmtDate(s.date)}</div>
            </div>
            <span className={`badge badge-${b.tone}`}><span className="ms">{b.icon}</span>{b.label}</span>
          </div>
          <p className="mt-16" style={{ fontSize: 15 }}>{text[s.status!]}</p>
        </div>
      )}
    </>
  );
}
