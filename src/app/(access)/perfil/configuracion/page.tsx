import type { Metadata } from "next";
import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { ActionForm, ChipGroup, Field, Select, Submit } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { onboardingStepAction } from "@/app/actions/profile";
import { ORG_TYPES, REGIONS, SECTORS } from "@/lib/domain";
import { parseJson } from "@/lib/format";

export const metadata: Metadata = { title: "Configuración del perfil" };

const TITLES = [
  ["Sobre usted", "Datos de contacto del titular de la cuenta."],
  ["Su organización", "La organización a la que representa en la red."],
  ["Cómo usará la plataforma", "Una sola cuenta puede comprar y vender; administración asigna los perfiles."],
  ["Sus intereses", "Usamos estas preferencias para recomendarle oportunidades."],
];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const u = await requireUser();
  const step = Math.min(4, Math.max(1, Number((await searchParams).paso) || 1));
  const [t, d] = TITLES[step - 1]!;
  return (
    <>
      <LightHeader action={u.onboardingDone ? { href: "/perfil", label: "Volver a mi perfil" } : undefined} />
      <div className="wrap" style={{ maxWidth: 880, padding: "clamp(32px, 7vw, 96px) var(--px)" }}>
        <div className="hstack between mb-16">
          <div className="eyebrow">Configuración del perfil</div>
          <div className="small c-lead">Paso {step} de 4</div>
        </div>
        <div className="progress-bars" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}
        </div>
        <h1 className="h1-lg" style={{ margin: "36px 0 8px" }}>{t}</h1>
        <p className="lead mb-24">{d}</p>
        <div className="card card-pad">
          <ActionForm action={onboardingStepAction.bind(null, step)} className="stack gap-24">
            {step === 1 && (
              <div className="grid-2">
                <Field name="name" label="Nombre completo" required defaultValue={u.name} autoComplete="name" />
                <Field name="title" label="Cargo" required defaultValue={u.title ?? ""} placeholder="Directora de inversiones" />
                <Field name="phone" label="Teléfono" optional defaultValue={u.phone ?? ""} placeholder="+52 55 0000 0000" type="tel" />
                <Field name="emailShown" label="Correo" value={u.email} readOnly />
              </div>
            )}
            {step === 2 && (
              <div className="grid-2">
                <Field name="org" label="Organización" required defaultValue={u.organization?.name ?? ""} />
                <Select name="orgType" label="Tipo de organización" required placeholder="Seleccione…" options={Object.entries(ORG_TYPES)} defaultValue={u.organization?.type ?? ""} />
                <Field name="website" label="Sitio web" optional defaultValue={u.organization?.website ?? ""} placeholder="https://" />
                <Field name="country" label="País" defaultValue={u.organization?.country ?? "México"} />
              </div>
            )}
            {step === 3 && (
              <div className="stack gap-12">
                <div className="field-label">Perfiles asignados a su cuenta</div>
                <div className="chips">
                  {[u.canBuy && "Comprador", u.canSell && !u.isAdvisor && "Vendedor", u.isAdvisor && "Asesor representante", u.isAdmin && "Administración"]
                    .filter(Boolean)
                    .map((r) => <span key={r as string} className="chip chip-on" style={{ cursor: "default" }}>{r}</span>)}
                  {!u.canBuy && !u.canSell && !u.isAdmin && <span className="c-lead">Sin perfiles asignados</span>}
                </div>
                <p className="field-hint">Los asigna el equipo de administración. Si necesita otro perfil (por ejemplo, comprar y vender con la misma cuenta), solicítelo al equipo.</p>
              </div>
            )}
            {step === 4 && (
              <>
                <ChipGroup name="sectors" multiple label="Sectores de interés" required={u.canBuy} options={[...SECTORS]} defaultValue={parseJson(u.prefSectors, [])} />
                <ChipGroup name="regions" multiple label="Regiones" options={[...REGIONS]} defaultValue={parseJson(u.prefRegions, [])} />
                <div className="grid-2">
                  <Field name="ticketMin" label="Ticket mínimo (millones de US$)" optional inputMode="decimal" defaultValue={u.ticketMin?.toString() ?? ""} />
                  <Field name="ticketMax" label="Ticket máximo (millones de US$)" optional inputMode="decimal" defaultValue={u.ticketMax?.toString() ?? ""} />
                </div>
              </>
            )}
            <div className="form-actions" style={{ marginTop: 0 }}>
              {step > 1 ? <Link href={`/perfil/configuracion?paso=${step - 1}`} className="btn btn-secondary btn-lg">Atrás</Link> : <span />}
              <Submit className="btn btn-lg" pendingText="Guardando…">{step < 4 ? "Continuar" : "Finalizar"}</Submit>
            </div>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
