import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { ActionButton } from "@/components/confirm";
import { Banner, Icon } from "@/components/ui";
import { createListingAction } from "@/app/actions/seller";

export const metadata: Metadata = { title: "Nueva publicación" };

export default async function Nueva() {
  const user = await requireMember();
  return (
    <div className="page page-narrow">
      <div className="eyebrow">Nueva publicación</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 12px" }}>Publicar una empresa</h1>
      <p className="lead mb-24">Un asistente de 6 pasos. Puede guardar el borrador en cualquier momento y continuar después.</p>
      <ol className="card rows" style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
        {[
          ["apartment", "Empresa", "Datos básicos; el nombre y la ciudad son confidenciales."],
          ["handshake", "Operación", "Tipo de operación, título anónimo, descripción y precio indicativo."],
          ["monitoring", "Finanzas", "Ventas y EBITDA en la moneda elegida, con visibilidad por cifra."],
          ["upload_file", "Teaser y documentos", "Teaser no confidencial y sala de documentos con permisos por archivo."],
          ["visibility", "Vista previa", "Cómo lo verán los compradores sin autorización."],
          ["send", "Enviar", "Revisión del equipo antes de publicar."],
        ].map(([i, t, d], n) => (
          <li key={t} className="row">
            <span className="step-dot">{n + 1}</span>
            <Icon name={i!} />
            <div className="row-main"><div className="fw6">{t}</div><div className="small c-lead">{d}</div></div>
          </li>
        ))}
      </ol>
      {user.canSell || user.isAdvisor ? (
        <ActionButton action={createListingAction} className="btn btn-lg" icon="add">Crear borrador</ActionButton>
      ) : (
        <Banner tone="info">Active el perfil de venta en <Link prefetch={false} href="/perfil">Mi perfil</Link> para publicar una empresa.</Banner>
      )}
    </div>
  );
}
