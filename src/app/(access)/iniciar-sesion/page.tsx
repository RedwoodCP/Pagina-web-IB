import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LightHeader } from "@/components/light-header";
import { ActionForm, Field, Submit } from "@/components/form";
import { Icon } from "@/components/ui";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const u = await getCurrentUser();
  if (u) redirect(u.isAdmin ? "/admin/solicitudes" : u.canBuy ? "/panel" : "/venta");
  const { next } = await searchParams;
  return (
    <>
      <LightHeader action={{ href: "/solicitar-acceso", label: "Solicitar acceso" }} />
      <div className="split">
        <div className="split-art on-dark">
          <div className="label-caps" style={{ color: "#fff" }}>Acceso privado</div>
          <div className="art-title" style={{ fontSize: 40, fontWeight: 300, lineHeight: 1.12, marginTop: 16, maxWidth: 440 }}>
            Su información y la de cada operación, protegidas en cada paso.
          </div>
        </div>
        <div className="split-form">
          <div>
            <div className="eyebrow">Acceso de miembros</div>
            <h1 className="h1-lg" style={{ margin: "12px 0 28px" }}>Iniciar sesión</h1>
            <ActionForm action={loginAction} className="stack gap-24">
              <input type="hidden" name="next" value={next ?? ""} />
              <Field name="email" label="Correo electrónico" type="email" autoComplete="email" required />
              <div className="stack gap-8">
                <Field name="password" label="Contraseña" type="password" autoComplete="current-password" required />
                <Link href="/recuperar" className="small" style={{ alignSelf: "flex-end" }}>¿La olvidó?</Link>
              </div>
              <Submit className="btn btn-lg btn-block" pendingText="Verificando…">Entrar</Submit>
              <div className="hstack gap-8 small c-lead">
                <Icon name="phonelink_lock" size={18} />
                Verificación en dos pasos: pendiente de configurar (no activa).
              </div>
            </ActionForm>
            <hr className="divider" />
            <div className="stack gap-12" style={{ fontSize: 15 }}>
              <Link href="/invitacion">Tengo una invitación</Link>
              <Link href="/estado-solicitud">Consultar el estado de mi solicitud</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
