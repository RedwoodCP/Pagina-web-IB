import type { Metadata } from "next";
import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { ActionForm, Field, Submit } from "@/components/form";
import { forgotPasswordAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Recuperar() {
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="wrap" style={{ maxWidth: 560, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        <div className="eyebrow">Acceso de miembros</div>
        <h1 className="h1-lg" style={{ margin: "12px 0 12px" }}>Recuperar contraseña</h1>
        <p className="lead mb-24">Le enviaremos un enlace de un solo uso, vigente durante una hora.</p>
        <div className="card card-pad">
          <ActionForm action={forgotPasswordAction} className="stack gap-24">
            <Field name="email" label="Correo electrónico" type="email" autoComplete="email" required />
            <Submit className="btn btn-lg" pendingText="Enviando…">Enviar enlace</Submit>
          </ActionForm>
        </div>
        <p className="small c-lead mt-16">
          Si no hay un proveedor de correo configurado, el mensaje queda en la bandeja de salida del administrador. <Link href="/iniciar-sesion">Volver</Link>
        </p>
      </div>
    </>
  );
}
