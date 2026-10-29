import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasDemoData } from "@/lib/demo";
import { initials } from "@/lib/format";
import { Brand } from "@/components/brand";
import { BottomNav, Crumb, SideNav, type NavItem, type NavSection } from "@/components/nav";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboardingDone && !user.isAdmin) redirect("/perfil/configuracion");

  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const demo = await hasDemoData(db);
  const sections: NavSection[] = [];
  let mobile: NavItem[];
  const seller = user.canSell || user.isAdvisor;

  if (user.isAdmin) {
    const [req, pubs, acc] = await Promise.all([
      db.membershipRequest.count({ where: { status: "pendiente" } }),
      db.listing.count({ where: { status: "revision" } }),
      db.engagement.count({ where: { accessStatus: "pendiente" } }),
    ]);
    sections.push({
      title: "ADMINISTRACIÓN",
      items: [
        { href: "/admin/solicitudes", label: "Solicitudes", icon: "how_to_reg", count: req },
        { href: "/admin/invitaciones", label: "Invitaciones", icon: "forward_to_inbox" },
        { href: "/admin/publicaciones", label: "Publicaciones", icon: "fact_check", count: pubs },
        { href: "/admin/accesos", label: "Accesos", icon: "key", count: acc },
        { href: "/admin/busquedas", label: "Búsquedas de compra", icon: "travel_explore" },
        { href: "/admin/usuarios", label: "Usuarios y permisos", icon: "group" },
        { href: "/admin/bitacora", label: "Bitácora", icon: "history" },
        { href: "/admin/correos", label: "Correos", icon: "mail" },
        { href: "/admin/configuracion", label: "Integraciones", icon: "settings" },
      ],
    });
    sections.push({
      title: "REFERENCIA",
      items: [{ href: "/oportunidades", label: "Catálogo (vista miembro)", icon: "search" }],
    });
    mobile = [
      { href: "/admin/solicitudes", label: "Solicitudes", icon: "how_to_reg" },
      { href: "/admin/invitaciones", label: "Invitar", icon: "forward_to_inbox" },
      { href: "/admin/publicaciones", label: "Publicar", icon: "fact_check" },
      { href: "/admin/accesos", label: "Accesos", icon: "key" },
    ];
  } else {
    if (user.canBuy)
      sections.push({
        title: "COMPRA",
        items: [
          { href: "/panel", label: "Panel", icon: "space_dashboard" },
          { href: "/oportunidades", label: "Catálogo", icon: "search" },
        ],
      });
    if (seller)
      sections.push({
        title: user.isAdvisor ? "MANDATOS" : "VENTA",
        items: [
          { href: "/venta", label: user.isAdvisor ? "Mis mandatos" : "Mis publicaciones", icon: "storefront", match: ["/venta$", "/venta/c"] },
          { href: "/venta/nueva", label: "Nueva publicación", icon: "add_box" },
        ],
      });
    sections.push({
      title: "CUENTA",
      items: [
        { href: "/perfil", label: "Mi perfil", icon: "person" },
        { href: "/notificaciones", label: "Notificaciones", icon: "notifications", count: unread },
      ],
    });
    mobile = [
      ...(user.canBuy
        ? [
            { href: "/panel", label: "Panel", icon: "space_dashboard" },
            { href: "/oportunidades", label: "Catálogo", icon: "search" },
          ]
        : []),
      ...(seller ? [{ href: "/venta", label: user.isAdvisor ? "Mandatos" : "Venta", icon: "storefront" }] : []),
      { href: "/perfil", label: "Perfil", icon: "person" },
    ];
    if (mobile.length < 4) mobile.push({ href: "/notificaciones", label: "Avisos", icon: "notifications" });
  }

  const role = user.isAdmin
    ? "Administración"
    : [user.canBuy && user.canSell ? "Compra y venta" : user.canSell ? "Venta" : user.canBuy ? "Compra" : "", user.isAdvisor ? "Asesor" : "", user.organization?.name]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className="shell">
      <aside className="sidebar on-dark">
        <div className="sidebar-brand">
          <Brand dark href={user.isAdmin ? "/admin/solicitudes" : user.canBuy ? "/panel" : "/venta"} />
        </div>
        <SideNav sections={sections} />
        <div className="sidebar-user">
          <Link prefetch={false} href="/perfil" className="avatar" aria-label="Mi perfil">
            {initials(user.name)}
          </Link>
          <div className="grow">
            <div style={{ fontSize: 14, fontWeight: 600 }} className="ellipsis">
              {user.name}
            </div>
            <div style={{ fontSize: 12, color: "#AEAEAE" }} className="ellipsis">
              {role}
            </div>
          </div>
          <form action={logoutAction}>
            <button className="icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión">
              <span aria-hidden="true" className="ms">logout</span>
            </button>
          </form>
        </div>
      </aside>
      <div className="main">
        {demo && (
          <div className="prototype-bar">
            <strong>DEMOSTRACIÓN</strong>
            <span>Las oportunidades y organizaciones marcadas «Demo» son ficticias.</span>
          </div>
        )}
        <header className="topbar">
          <div className="mobile-only">
            <Brand compact href={user.isAdmin ? "/admin/solicitudes" : "/panel"} />
          </div>
          <div className="grow desktop-only">
            <Crumb />
          </div>
          <div className="grow mobile-only" />
          <Link prefetch={false} href="/notificaciones" className="icon-btn" aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}>
            <span aria-hidden="true" className="ms" style={{ fontSize: 22 }}>notifications</span>
            {unread > 0 && <span className="dot" />}
          </Link>
          <form action={logoutAction} className="mobile-only">
            <button className="icon-btn" aria-label="Cerrar sesión">
              <span aria-hidden="true" className="ms">logout</span>
            </button>
          </form>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
      <BottomNav items={mobile} />
    </div>
  );
}
