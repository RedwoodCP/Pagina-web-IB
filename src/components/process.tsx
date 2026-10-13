import type { ListingCtx } from "@/lib/access";
import { fmtDate } from "@/lib/format";

type Step = { label: string; sub: string; state: "done" | "current" | "todo" | "err" };

export function processSteps(ctx: ListingCtx): Step[] {
  const e = ctx.engagement;
  const nda = e?.ndaStatus ?? "none";
  const acc = e?.accessStatus ?? "none";
  const signedAt = e?.nda?.completedAt ? fmtDate(e.nda.completedAt) : "";
  const decided = e?.accessDecidedAt ? fmtDate(e.accessDecidedAt) : "";
  return [
    { label: "Solicitud de información", sub: nda === "none" ? "Registre su interés en la oportunidad" : `Registrada el ${fmtDate(e!.createdAt)}`, state: nda === "none" ? "current" : "done" },
    {
      label: "Firma del NDA",
      sub: nda === "firmado" ? `Registrado el ${signedAt}` : nda === "pendiente_firma" ? "Pendiente de su firma" : "Después de solicitar información",
      state: nda === "firmado" ? "done" : nda === "pendiente_firma" ? "current" : "todo",
    },
    {
      label: "Autorización de acceso",
      sub: { none: "La decide el vendedor o su asesor", pendiente: "En revisión por el vendedor", autorizado: `Autorizado el ${decided}`, rechazado: "No autorizado", revocado: `Revocado el ${decided}` }[acc] ?? "",
      state: acc === "autorizado" ? "done" : acc === "pendiente" ? "current" : acc === "rechazado" || acc === "revocado" ? "err" : "todo",
    },
    { label: "Espacio privado", sub: acc === "autorizado" ? "Disponible" : "Documentos según permisos", state: acc === "autorizado" ? "current" : "todo" },
  ];
}

export function Steps({ steps }: { steps: Step[] }) {
  const ic = { done: "check", current: "more_horiz", todo: "lock", err: "close" };
  return (
    <ol className="steps-v">
      {steps.map((s) => (
        <li key={s.label} className={s.state} aria-current={s.state === "current" ? "step" : undefined}>
          <span className="vdot"><span aria-hidden="true" className="ms">{ic[s.state]}</span></span>
          <div>
            <div className="vlabel">{s.label}</div>
            <div className="vsub">{s.sub}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

