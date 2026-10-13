"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["solicitudes", "Solicitudes de membresía", "Solicitudes de membresía"],
  ["invitaciones", "Invitaciones", "Invitaciones"],
  ["publicaciones", "Publicaciones", "Aprobación de publicaciones"],
  ["accesos", "Accesos", "Accesos a oportunidades"],
  ["usuarios", "Usuarios", "Usuarios y permisos"],
  ["bitacora", "Bitácora", "Bitácora de acciones"],
  ["correos", "Correos", "Correos transaccionales"],
  ["configuracion", "Integraciones", "Integraciones"],
] as const;

export function AdminTabs({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  const cur = TABS.find(([k]) => path.startsWith(`/admin/${k}`)) ?? TABS[0];
  return (
    <>
      <h1 className="h1-lg" style={{ margin: "12px 0 28px" }}>{cur[2]}</h1>
      <nav className="tabs mb-24" aria-label="Administración">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/${k}`} className="tab" aria-current={cur[0] === k ? "page" : undefined}>
            {label}
            {!!counts[k] && <span className="count-pill">{counts[k]}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
