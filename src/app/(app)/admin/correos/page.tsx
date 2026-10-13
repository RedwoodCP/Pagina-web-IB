import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";
import { Banner, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Correos" };

export default async function Correos() {
  const rows = await db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      {env.emailProvider === "none" && (
        <div className="mb-16">
          <Banner tone="warn">
            No hay proveedor de correo configurado (EMAIL_PROVIDER=none). Los mensajes no se envían: quedan aquí para que el equipo
            pueda compartir los enlaces manualmente. Configure un proveedor antes de operar con usuarios reales.
          </Banner>
        </div>
      )}
      {rows.length === 0 ? (
        <Empty icon="mail" title="Sin correos" />
      ) : (
        <div className="card rows">
          {rows.map((m) => (
            <details key={m.id} style={{ padding: "14px 20px" }}>
              <summary className="hstack gap-12" style={{ cursor: "pointer", flexWrap: "wrap" }}>
                <span className="fw6">{m.subject}</span>
                <span className="small c-lead">{m.to} · {fmtDateTime(m.createdAt)}</span>
                <span className={`badge badge-${m.status === "enviado" ? "ok" : m.status === "error" ? "err" : "neutral"}`}>{{ enviado: "Enviado", sin_proveedor: "No enviado · sin proveedor", error: "Error", pendiente: "Pendiente" }[m.status]}</span>
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, background: "#FAFAFA", padding: 14, marginTop: 12, wordBreak: "break-all" }}>{m.body}</pre>
              {m.error && <div className="field-error">{m.error}</div>}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
