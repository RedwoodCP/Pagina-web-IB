import type { Metadata } from "next";
import Link from "next/link";
import { hasMemberRoles, requireUser } from "@/lib/auth";
import { ORG_TYPES } from "@/lib/domain";
import { parseJson } from "@/lib/format";
import { ActionForm, Field, Submit } from "@/components/form";
import { Icon } from "@/components/ui";
import { changePasswordAction } from "@/app/actions/profile";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const u = await requireUser();
  const roles = [u.canBuy && "Compra", u.canSell && "Venta", u.isAdvisor && "Asesor representante", u.adminAvailable && "Administración"].filter(Boolean).join(" · ");
  const sec = (n: number, t: string, rows: [string, string][]) => (
    <section className="card">
      <div className="hstack between" style={{ padding: "18px 20px 0" }}>
        <h2 className="h2" style={{ fontSize: 18 }}>{t}</h2>
        {!u.adminAvailable && <Link prefetch={false} href={`/perfil/configuracion?paso=${n}`} className="btn btn-secondary btn-sm"><Icon name="edit" />Editar</Link>}
      </div>
      <dl className="kv mt-12">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || "—"}</dd></div>)}</dl>
    </section>
  );
  return (
    <div className="page page-narrow">
      <div className="eyebrow">Cuenta</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 28px" }}>Mi perfil</h1>
      <div className="stack gap-24">
        {sec(1, "Sobre usted", [["Nombre", u.name], ["Cargo", u.title ?? ""], ["Teléfono", u.phone ?? ""], ["Correo", u.email]])}
        {sec(2, "Organización", [["Nombre", u.organization?.name ?? ""], ["Tipo", ORG_TYPES[u.organization?.type ?? ""] ?? ""], ["Sitio web", u.organization?.website ?? ""], ["País", u.organization?.country ?? ""]])}
        {sec(3, "Uso de la plataforma", [["Perfiles activos", roles]])}
        {!u.adminAvailable && sec(4, "Intereses", [["Sectores", parseJson<string[]>(u.prefSectors, []).join(", ")], ["Regiones", parseJson<string[]>(u.prefRegions, []).join(", ")], ["Ticket (US$ M)", u.ticketMin != null || u.ticketMax != null ? `${u.ticketMin ?? "—"} – ${u.ticketMax ?? "—"}` : ""]])}
        {u.adminAvailable && hasMemberRoles(u) && (
          <section className="card card-pad">
            <h2 className="h2" style={{ fontSize: 18 }}>Vista de trabajo</h2>
            <p className="c-lead mt-8 mb-16">
              {u.isAdmin
                ? "Está en la vista de administración. Cambie a compra y venta para publicar empresas o buscar oportunidades como cualquier miembro."
                : "Está en la vista de compra y venta: ve y actúa como cualquier miembro, sin permisos de administración."}
            </p>
            <a href={`/api/modo?vista=${u.isAdmin ? "miembro" : "admin"}`} className="btn btn-secondary"><Icon name="swap_horiz" />{u.isAdmin ? "Cambiar a compra y venta" : "Volver a administración"}</a>
          </section>
        )}
        <section className="card card-pad">
          <h2 className="h2 mb-16" style={{ fontSize: 18 }}>Cambiar contraseña</h2>
          <ActionForm action={changePasswordAction} className="stack gap-16" resetOnSuccess>
            <Field name="current" label="Contraseña actual" type="password" autoComplete="current-password" />
            <div className="grid-2">
              <Field name="password" label="Contraseña nueva" type="password" autoComplete="new-password" hint="Al menos 10 caracteres, con letras y números." />
              <Field name="password2" label="Confirmar contraseña" type="password" autoComplete="new-password" />
            </div>
            <div><Submit pendingText="Guardando…">Actualizar contraseña</Submit></div>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
