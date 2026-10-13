import { LightHeader } from "@/components/light-header";
import { ActionForm, Field, Submit } from "@/components/form";
import { resetPasswordAction } from "@/app/actions/auth";

export default async function Restablecer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="wrap" style={{ maxWidth: 560, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        <h1 className="h1-lg" style={{ margin: "0 0 24px" }}>Nueva contraseña</h1>
        <div className="card card-pad">
          <ActionForm action={resetPasswordAction.bind(null, token)} className="stack gap-24">
            <Field name="password" label="Contraseña nueva" type="password" autoComplete="new-password" required hint="Al menos 10 caracteres, con letras y números." />
            <Field name="password2" label="Confirmar contraseña" type="password" autoComplete="new-password" required />
            <Submit className="btn btn-lg" pendingText="Guardando…">Guardar contraseña</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
