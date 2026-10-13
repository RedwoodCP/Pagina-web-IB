import type { Metadata } from "next";
import { env } from "@/lib/env";
import { signatureStatus } from "@/lib/signature";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Integraciones" };

export default function Configuracion() {
  const sig = signatureStatus();
  const rows: [string, string, boolean, string][] = [
    ["Firma electrónica del NDA", sig.label, sig.mode === "proveedor" && sig.configured, "SIGNATURE_PROVIDER, SIGNATURE_API_KEY, SIGNATURE_WEBHOOK_SECRET · adaptador en src/lib/signature.ts"],
    ["Correo transaccional", env.emailProvider === "none" ? "Sin proveedor: los correos quedan en la bandeja de salida" : `Proveedor «${env.emailProvider}» (adaptador pendiente)`, false, "EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM · src/lib/notify.ts"],
    ["Almacenamiento de archivos", `Disco local del servidor (${env.storageDir}), fuera de /public, con enlaces firmados de 5 minutos`, true, "Para producción: almacenamiento cifrado (S3/GCS con SSE) · src/lib/files.ts"],
    ["Antivirus de archivos", "No configurado: se valida tipo, tamaño y firma binaria, no malware", false, "Integrar ClamAV o servicio equivalente antes de storeFile()"],
    ["Verificación en dos pasos", "No configurada", false, "Pendiente: TOTP o llave de seguridad"],
    ["Calendario / videollamada", "No configurado: las reuniones se coordinan por mensaje", false, "Integración opcional (Google Calendar, Microsoft 365)"],
    ["Datos de demostración", env.showDemo ? "Visibles en el catálogo (SHOW_DEMO_DATA=true)" : "Ocultos", !env.showDemo, "Elimínelos con npm run demo:purge antes de operar con datos reales"],
  ];
  return (
    <div className="card rows">
      {rows.map(([t, d, ok, how]) => (
        <div key={t} className="row" style={{ alignItems: "flex-start" }}>
          <span aria-hidden="true" className="ms" style={{ color: ok ? "var(--ok-fg)" : "var(--warn-fg)" }}>{ok ? "check_circle" : "warning"}</span>
          <div className="row-main">
            <div className="fw6">{t}</div>
            <div className="small mt-4">{d}</div>
            <div className="small c-lead mt-4"><Icon name="settings" size={14} /> {how}</div>
          </div>
          <span className={`badge badge-${ok ? "ok" : "warn"}`}>{ok ? "Operativo" : "Requiere configuración"}</span>
        </div>
      ))}
    </div>
  );
}
