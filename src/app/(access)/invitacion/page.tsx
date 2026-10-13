import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LightHeader } from "@/components/light-header";

export const metadata: Metadata = { title: "Invitación" };

async function go(fd: FormData) {
  "use server";
  const raw = String(fd.get("link") ?? "").trim();
  const token = raw.split("/invitacion/").pop()?.split(/[?#\s]/)[0] ?? "";
  redirect(token ? `/invitacion/${encodeURIComponent(token)}` : "/invitacion?e=1");
}

export default async function Invitacion({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="wrap" style={{ maxWidth: 640, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        <div className="eyebrow">Invitación personal</div>
        <h1 className="h1-lg" style={{ margin: "12px 0 12px" }}>Abra su invitación</h1>
        <p className="lead mb-24">
          Las invitaciones se envían por correo con un enlace personal de un solo uso, vigente 14 días. Ábralo directamente o
          péguelo aquí.
        </p>
        <form action={go} className="card card-pad stack gap-16">
          <div className="field">
            <label htmlFor="l">Enlace de invitación</label>
            <input id="l" name="link" className="input" placeholder="https://…/invitacion/…" aria-invalid={e ? true : undefined} />
            {e && <div className="field-error"><span className="ms">error</span>Pegue el enlace completo que recibió.</div>}
          </div>
          <div><button className="btn btn-lg">Continuar</button></div>
        </form>
        <p className="small c-lead mt-16">
          ¿No tiene invitación? <Link href="/solicitar-acceso">Solicite acceso</Link>.
        </p>
      </div>
    </>
  );
}
