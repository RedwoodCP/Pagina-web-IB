import "server-only";
import { env } from "./env";

/**
 * Integración con un proveedor de firma electrónica.
 *
 * Estado actual: NO hay proveedor conectado (SIGNATURE_PROVIDER=none). En ese modo la
 * plataforma registra una «aceptación del NDA» con nombre, cargo, organización, fecha,
 * IP, navegador, versión y huella (sha256) del texto. Ese registro NO es una firma
 * electrónica avanzada ni certificada, y la interfaz lo dice expresamente.
 *
 * Para conectar un proveedor (DocuSign, Dropbox Sign, Adobe Sign, Mifiel…):
 *   1. Configure SIGNATURE_PROVIDER, SIGNATURE_API_KEY y SIGNATURE_WEBHOOK_SECRET.
 *   2. Implemente createEnvelope() con la API del proveedor (crear sobre a partir de la
 *      plantilla del NDA y devolver la URL de firma embebida o el envío por correo).
 *   3. El proveedor notifica en /api/webhooks/firma; allí se valida la firma HMAC y se
 *      marca el NDA como completado. Solo entonces el acceso pasa a «pendiente».
 */

export type SignatureMode = "registro_interno" | "proveedor";

export function signatureStatus() {
  const p = env.signatureProvider;
  if (p === "none")
    return {
      mode: "registro_interno" as SignatureMode,
      provider: null,
      configured: false,
      label: "Aceptación registrada en la plataforma (sin proveedor de firma electrónica)",
    };
  const configured = !!process.env.SIGNATURE_API_KEY && !!process.env.SIGNATURE_WEBHOOK_SECRET;
  return {
    mode: "proveedor" as SignatureMode,
    provider: p,
    configured,
    label: configured
      ? `Firma electrónica con ${p === "docusign" ? "DocuSign" : "Dropbox Sign"}`
      : `Proveedor «${p}» seleccionado pero sin credenciales: requiere configuración`,
  };
}

export async function createEnvelope(_input: {
  engagementId: string;
  signerName: string;
  signerEmail: string;
  ndaText: string;
}): Promise<{ ok: false; error: string } | { ok: true; providerRef: string; signUrl?: string }> {
  const s = signatureStatus();
  if (s.mode !== "proveedor") return { ok: false, error: "No hay proveedor de firma configurado." };
  if (!s.configured) return { ok: false, error: s.label };
  return {
    ok: false,
    error: `El adaptador para «${s.provider}» aún no está implementado. Vea src/lib/signature.ts.`,
  };
}
