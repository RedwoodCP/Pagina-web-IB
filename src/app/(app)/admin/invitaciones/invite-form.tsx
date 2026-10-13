"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { sendInvitationAction, type InviteResult } from "@/app/actions/admin";
import { toast } from "@/components/toast";
import { PROFILES } from "@/lib/domain";

export function InviteForm() {
  const [s, run, pending] = useActionState<InviteResult, FormData>(sendInvitationAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (s.message) toast(s.message);
    if (s.ok) ref.current?.reset();
  }, [s]);
  const err = (k: string) => s.fields?.[k] && <div className="field-error"><span aria-hidden="true" className="ms">error</span>{s.fields[k]}</div>;
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => run(fd)); }} className="card stack gap-16" style={{ padding: 24 }} noValidate>
      <h2 className="h2" style={{ fontSize: 20 }}>Enviar invitación</h2>
      <div className="field">
        <label htmlFor="inv-email">Correo electrónico *</label>
        <input id="inv-email" name="email" type="email" className="input" placeholder="nombre@organizacion.com" defaultValue="" aria-invalid={!!s.fields?.email || undefined} />
        {err("email")}
      </div>
      <div className="field">
        <label htmlFor="inv-p">Perfil sugerido</label>
        <select id="inv-p" name="profile" className="select" defaultValue="comprador">
          {Object.entries(PROFILES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="field-hint">Orienta la configuración inicial; la persona podrá comprar y vender con la misma cuenta.</div>
      </div>
      <div className="field">
        <label htmlFor="inv-m">Mensaje personal <span className="opt">(opcional)</span></label>
        <textarea id="inv-m" name="message" className="textarea" rows={3} maxLength={1000} defaultValue="" />
      </div>
      <button className="btn btn-block" disabled={pending}>{pending && <span className="spinner" />}Enviar invitación · vigencia 14 días</button>
      {s.link && (
        <div className="form-banner warn" role="status">
          <span aria-hidden="true" className="ms">link</span>
          <div style={{ minWidth: 0 }}>
            Sin proveedor de correo configurado. Enlace personal de un solo uso (compártalo por un canal seguro):
            <input readOnly className="input mt-8" value={s.link} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" style={{ fontSize: 13 }} />
            <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => navigator.clipboard?.writeText(s.link!).then(() => toast("Enlace copiado."))}>Copiar enlace</button>
          </div>
        </div>
      )}
    </form>
  );
}
