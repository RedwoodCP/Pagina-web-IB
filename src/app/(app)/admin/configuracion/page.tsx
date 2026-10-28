import type { Metadata } from "next";
import { env } from "@/lib/env";
import { signatureStatus } from "@/lib/signature";
import { storageMode } from "@/lib/storage";
import { MAX_FILE_MB } from "@/lib/files";
import { Banner, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { db } from "@/lib/db";
import { hasDemoData } from "@/lib/demo";
import { getCurrentUser } from "@/lib/auth";
import { purgeDemoAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Integraciones" };

export default async function Configuracion() {
  const demo = await hasDemoData(db);
  const me = await getCurrentUser();
  const sig = signatureStatus();
  const rows: [string, string, boolean, string][] = [
    ["Firma electrónica del NDA", sig.label, sig.mode === "proveedor" && sig.configured, "SIGNATURE_PROVIDER, SIGNATURE_API_KEY, SIGNATURE_WEBHOOK_SECRET · adaptador en src/lib/signature.ts"],
    [
      "Correo transaccional",
      env.emailProvider === "resend"
        ? `Resend · remitente ${process.env.EMAIL_FROM ?? "(falta EMAIL_FROM)"}. El estado de cada envío aparece en Correos.`
        : "Sin proveedor: los correos quedan en la bandeja de salida (Correos)",
      env.emailProvider === "resend" && !!process.env.EMAIL_API_KEY && !!process.env.EMAIL_FROM,
      "EMAIL_PROVIDER=resend, EMAIL_API_KEY, EMAIL_FROM · src/lib/notify.ts",
    ],
    [
      "Almacenamiento de archivos",
      storageMode() === "supabase"
        ? `Supabase Storage, bucket privado; enlaces firmados de 5 minutos desde la plataforma; máximo ${MAX_FILE_MB} MB por archivo`
        : `Disco local del servidor (${env.storageDir}), fuera de /public, con enlaces firmados de 5 minutos`,
      true,
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY · src/lib/storage.ts",
    ],
    ["Antivirus de archivos", "No configurado: se valida tipo, tamaño y firma binaria, no malware", false, "Integrar ClamAV o servicio equivalente antes de storeFile()"],
    ["Verificación en dos pasos", "No configurada", false, "Pendiente: TOTP o llave de seguridad"],
    ["Calendario / videollamada", "No configurado: las reuniones se coordinan por mensaje", false, "Integración opcional (Google Calendar, Microsoft 365)"],
    ["Datos de demostración", demo ? "Presentes: usuarios, empresas y documentos ficticios marcados «Demo»" : "Eliminados", !demo, "Botón «Eliminar datos de demostración» al final de esta página"],
  ];
  return (
    <>
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
    {demo && (
      <section className="card card-pad mt-32">
        <h2 className="h2">Pasar a operación real</h2>
        <p className="c-lead mt-8 mb-16" style={{ maxWidth: 720 }}>
          Elimina todos los usuarios, organizaciones, oportunidades, documentos, invitaciones y solicitudes de demostración. Los
          usuarios reales y su información se conservan. Esta acción no se puede deshacer.
        </p>
        {me?.isDemo ? (
          <Banner tone="warn">Para hacerlo, primero invite a un administrador real (Invitaciones › perfil «Administrador»), acepte la invitación e inicie sesión con esa cuenta.</Banner>
        ) : (
          <ActionButton action={purgeDemoAction} className="btn btn-danger" icon="delete_forever" danger reason reasonRequired reasonLabel="Escriba ELIMINAR para confirmar" confirm={{ title: "Eliminar datos de demostración", body: "Se borrarán de forma permanente todos los datos ficticios, incluida la cuenta admin@demo.redwood.test." }} confirmLabel="Eliminar definitivamente">
            Eliminar datos de demostración
          </ActionButton>
        )}
      </section>
    )}
    </>
  );
}
