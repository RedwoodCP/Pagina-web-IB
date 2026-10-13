import type { Metadata } from "next";
import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { ActionForm, Check, ChipGroup, Field, Select, Submit, TextArea } from "@/components/form";
import { Icon } from "@/components/ui";
import { requestMembershipAction } from "@/app/actions/auth";
import { INTERESTS, ORG_TYPES } from "@/lib/domain";

export const metadata: Metadata = { title: "Solicitar acceso" };

export default function SolicitarAcceso() {
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="wrap" style={{ maxWidth: 1120, padding: "clamp(32px, 7vw, 96px) var(--px)", display: "flex", flexWrap: "wrap", gap: 56 }}>
        <div style={{ flex: "1 1 320px", maxWidth: 400 }}>
          <div className="eyebrow">Solicitud de membresía</div>
          <h1 className="h1-lg" style={{ margin: "16px 0 20px" }}>Solicite acceso a la red</h1>
          <p className="lead" style={{ fontSize: 17 }}>
            Nuestro equipo revisa cada solicitud para mantener una comunidad de participantes calificados. Respondemos por correo
            en un plazo aproximado de 3 a 5 días hábiles.
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: "32px 0" }} className="rows">
            {[
              "Revisamos su solicitud y validamos la información de su organización.",
              "Si se aprueba, recibirá una invitación personal con vigencia de 14 días.",
              "Al aceptarla, configura su perfil y accede al catálogo privado.",
            ].map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 20, padding: "16px 0", fontSize: 15, borderTop: i === 0 ? "1px solid rgba(26,26,26,.1)" : undefined }}>
                <span className="fw7 num" style={{ fontSize: 13 }}>0{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <div className="panel-muted hstack gap-16" style={{ alignItems: "flex-start", fontSize: 14, color: "#444" }}>
            <Icon name="shield_person" />
            <span>Usamos su información solo para evaluar la solicitud. No se comparte con otros miembros.</span>
          </div>
        </div>
        <div className="card card-pad" style={{ flex: "1 1 520px", minWidth: 0 }}>
          <ActionForm action={requestMembershipAction} className="stack gap-24">
            <div className="grid-2">
              <Field name="name" label="Nombre completo" required autoComplete="name" maxLength={120} />
              <Field name="email" label="Correo corporativo" required type="email" autoComplete="email" maxLength={200} />
              <Field name="organization" label="Organización" required autoComplete="organization" maxLength={160} />
              <Select name="orgType" label="Tipo de organización" required placeholder="Seleccione…" options={Object.entries(ORG_TYPES)} />
              <Field name="phone" label="Teléfono" optional type="tel" autoComplete="tel" maxLength={40} />
            </div>
            <ChipGroup name="interest" label="Interés principal" required options={Object.entries(INTERESTS)} />
            <TextArea name="message" label="¿Qué tipo de operación busca?" optional maxLength={1500} placeholder="Por ejemplo: adquisiciones en manufactura del Bajío, entre US$ 5 y 20 M." />
            <Check name="privacy">
              He leído el <Link href="/legal/privacidad" target="_blank">aviso de privacidad</Link> y acepto que mis datos se usen para evaluar mi solicitud.
            </Check>
            <div className="hstack gap-16" style={{ borderTop: "1px solid rgba(26,26,26,.1)", paddingTop: 24, flexWrap: "wrap" }}>
              <Submit className="btn btn-lg" pendingText="Enviando…">Enviar solicitud</Submit>
              <span className="small c-lead">* Campos obligatorios</span>
            </div>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
