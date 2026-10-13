"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "./toast";

type Result = { ok?: boolean; error?: string; message?: string } | void;

/**
 * Botón que ejecuta una Server Action. Con `confirm`, pide confirmación en un diálogo
 * (acciones destructivas o irreversibles). Con `reason`, solicita un motivo.
 */
export function ActionButton({
  action,
  children,
  className = "btn btn-secondary btn-sm",
  icon,
  confirm,
  confirmLabel = "Confirmar",
  danger,
  reason,
  reasonLabel = "Motivo",
  reasonRequired,
}: {
  action: (fd: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
  icon?: string;
  confirm?: { title: string; body: ReactNode };
  confirmLabel?: string;
  danger?: boolean;
  reason?: boolean;
  reasonLabel?: string;
  reasonRequired?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fd: FormData) {
    if (reasonRequired && !String(fd.get("reason") ?? "").trim()) {
      setErr("Indique el motivo.");
      return;
    }
    start(async () => {
      const r = await action(fd);
      if (r && r.error) {
        setErr(r.error);
        toast(r.error);
        return;
      }
      ref.current?.close();
      setErr(null);
      if (r && r.message) toast(r.message);
    });
  }

  const label = (
    <>
      {pending ? <span className="spinner" aria-hidden="true" /> : icon ? <span aria-hidden="true" className="ms">{icon}</span> : null}
      {children}
    </>
  );

  if (!confirm && !reason)
    return (
      <form action={run} style={{ display: "contents" }}>
        <button className={className} disabled={pending} aria-busy={pending || undefined}>
          {label}
        </button>
      </form>
    );

  return (
    <>
      <button type="button" className={className} onClick={() => { setErr(null); ref.current?.showModal(); }} disabled={pending}>
        {label}
      </button>
      <dialog ref={ref} className="modal" aria-labelledby="dlg-t">
        <form action={run}>
          <div className="modal-body">
            <div className="h2" id="dlg-t" style={{ fontSize: 20 }}>
              {confirm?.title ?? "Confirmar acción"}
            </div>
            {confirm?.body && <div className="lead" style={{ fontSize: 15 }}>{confirm.body}</div>}
            {reason && (
              <div className="field">
                <label htmlFor="dlg-reason">
                  {reasonLabel}
                  {!reasonRequired && <span className="opt">(opcional)</span>}
                </label>
                <textarea id="dlg-reason" name="reason" className="textarea" rows={3} maxLength={500} />
              </div>
            )}
            {err && (
              <div className="field-error" role="alert">
                <span aria-hidden="true" className="ms">error</span>
                {err}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button className={danger ? "btn btn-danger" : "btn"} disabled={pending} aria-busy={pending || undefined}>
              {pending && <span className="spinner" aria-hidden="true" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
