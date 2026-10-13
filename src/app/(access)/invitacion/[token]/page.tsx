import type { Metadata } from "next";
import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { ActionForm, Check, Field, Submit } from "@/components/form";
import { Icon } from "@/components/ui";
import { acceptInvitationAction } from "@/app/actions/auth";
import { lookupInvitation } from "@/lib/invitations";
import { fmtDate } from "@/lib/format";
import { PROFILES } from "@/lib/domain";
import { brandLabel } from "@/components/brand";

export const metadata: Metadata = { title: "Aceptar invitación" };

const MSG = {
  invalida: ["link_off", "Enlace no válido", "El enlace de invitación no existe o está incompleto. Revise que lo copió completo."],
  aceptada: ["check_circle", "Esta invitación ya fue aceptada", "La cuenta ya está activa. Inicie sesión con su correo y contraseña."],
  vencida: ["event_busy", "La invitación venció", "Las invitaciones tienen una vigencia de 14 días. Solicite a nuestro equipo una nueva invitación."],
  revocada: ["block", "La invitación fue revocada", "Este enlace dejó de funcionar. Si cree que se trata de un error, escriba a nuestro equipo."],
} as const;

export default async function AceptarInvitacion({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const look = await lookupInvitation(token);

  if (look.state !== "enviada") {
    const [icon, title, text] = MSG[look.state];
    return (
      <>
        <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
        <div className="wrap" style={{ maxWidth: 640, padding: "clamp(40px, 8vw, 112px) var(--px)" }}>
          <div className="empty" style={{ alignItems: "flex-start", textAlign: "left", padding: 32 }}>
            <Icon name={icon} />
            <div className="empty-title">{title}</div>
            <div className="empty-text">
              {text}
              {look.state === "vencida" && <> Venció el {fmtDate(look.inv.expiresAt)}.</>}
            </div>
            <div className="wrap-gap mt-8">
              {look.state === "aceptada" ? (
                <Link href="/iniciar-sesion" className="btn">Iniciar sesión</Link>
              ) : (
                <Link href="/solicitar-acceso" className="btn">Solicitar acceso</Link>
              )}
              <Link href="/" className="btn btn-secondary">Ir al inicio</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const inv = look.inv;
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="split">
        <div className="split-art on-dark">
          <div className="label-caps" style={{ color: "#fff" }}>Invitación</div>
          <div className="art-title" style={{ fontSize: 40, fontWeight: 300, lineHeight: 1.12, marginTop: 16, maxWidth: 440 }}>
            Ha recibido una invitación a una red privada de compra y venta de empresas.
          </div>
        </div>
        <div className="split-form">
          <div>
            <div className="eyebrow">Invitación personal · vence el {fmtDate(inv.expiresAt)}</div>
            <h1 className="h1-lg" style={{ margin: "12px 0 16px" }}>Bienvenido.</h1>
            <p className="lead mb-24">
              {inv.invitedBy?.name ? `${inv.invitedBy.name}, del equipo de ${brandLabel()},` : `El equipo de ${brandLabel()}`} le invitó a unirse
              como miembro ({PROFILES[inv.profile] ?? inv.profile}). Cree una contraseña para activar su cuenta.
            </p>
            {inv.message && (
              <blockquote className="panel-muted mb-24" style={{ margin: "0 0 24px", fontSize: 15 }}>«{inv.message}»</blockquote>
            )}
            <ActionForm action={acceptInvitationAction.bind(null, token)} className="stack gap-20" >
              <Field name="emailShown" label="Correo electrónico" value={inv.email} readOnly />
              <Field name="name" label="Nombre completo" required autoComplete="name" />
              <Field name="password" label="Contraseña" type="password" autoComplete="new-password" required hint="Al menos 10 caracteres, con letras y números." />
              <Field name="password2" label="Confirmar contraseña" type="password" autoComplete="new-password" required />
              <Check name="terms">
                Acepto los <Link href="/legal/terminos" target="_blank">términos de uso</Link> y el compromiso general de confidencialidad de la plataforma.
              </Check>
              <Submit className="btn btn-lg btn-block" pendingText="Activando cuenta…">Aceptar invitación y continuar</Submit>
              <p className="small c-lead">¿No esperaba esta invitación? Puede ignorarla. Las invitaciones vencidas o revocadas no pueden usarse.</p>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
