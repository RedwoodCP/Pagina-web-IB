"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string; count?: number; match?: string[] };
export type NavSection = { title: string; items: NavItem[] };

function isActive(path: string, it: NavItem) {
  const m = it.match ?? [it.href];
  return m.some((h) => (h.endsWith("$") ? path === h.slice(0, -1) : path === h || path.startsWith(h + "/")));
}

export function SideNav({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Principal">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="nav-title">{s.title}</div>
          {s.items.map((it) => (
            <Link prefetch={false} key={it.href} href={it.href} className="nav-item" aria-current={isActive(path, it) ? "page" : undefined}>
              <span aria-hidden="true" className="ms">{it.icon}</span>
              <span className="grow">{it.label}</span>
              {!!it.count && <span className="count-pill">{it.count}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {items.map((it) => (
        <Link prefetch={false} key={it.href} href={it.href} aria-current={isActive(path, it) ? "page" : undefined}>
          <span aria-hidden="true" className="ms">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

const CRUMBS: [RegExp, string][] = [
  [/^\/panel/, "Compra · Panel"],
  [/^\/oportunidades\/[^/]+\/nda/, "Catálogo · Confidencialidad"],
  [/^\/oportunidades\/[^/]+\/espacio/, "Catálogo · Espacio privado"],
  [/^\/oportunidades\/[^/]+/, "Catálogo · Detalle"],
  [/^\/oportunidades/, "Compra · Catálogo privado"],
  [/^\/venta\/nueva/, "Venta · Nueva publicación"],
  [/^\/venta\/[^/]+\/editar/, "Venta · Editar publicación"],
  [/^\/venta\/[^/]+/, "Venta · Seguimiento"],
  [/^\/venta/, "Venta · Mis publicaciones"],
  [/^\/busquedas/, "Compra · Mis búsquedas"],
  [/^\/perfil/, "Cuenta · Mi perfil"],
  [/^\/notificaciones/, "Cuenta · Notificaciones"],
  [/^\/admin\/solicitudes/, "Administración · Solicitudes de membresía"],
  [/^\/admin\/invitaciones/, "Administración · Invitaciones"],
  [/^\/admin\/publicaciones/, "Administración · Publicaciones"],
  [/^\/admin\/accesos/, "Administración · Accesos"],
  [/^\/admin\/busquedas/, "Administración · Búsquedas de compra"],
  [/^\/admin\/usuarios/, "Administración · Usuarios y permisos"],
  [/^\/admin\/bitacora/, "Administración · Bitácora"],
  [/^\/admin\/correos/, "Administración · Correos"],
  [/^\/admin\/configuracion/, "Administración · Integraciones"],
];

export function Crumb() {
  const path = usePathname();
  const c = CRUMBS.find(([r]) => r.test(path))?.[1] ?? "";
  const code = path.match(/RW-\d+/)?.[0];
  return <div className="crumb">{code ? c.replace("Catálogo", "Catálogo · " + code) : c}</div>;
}
