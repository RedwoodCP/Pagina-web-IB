import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandLabel } from "@/components/brand";
import { AdminTabs } from "./tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [req, inv, pubs, acc, bus] = await Promise.all([
    db.membershipRequest.count({ where: { status: "pendiente" } }),
    db.invitation.count({ where: { status: "enviada", expiresAt: { gt: new Date() } } }),
    db.listing.count({ where: { status: "revision" } }),
    db.engagement.count({ where: { accessStatus: "pendiente" } }),
    db.buySearch.count({ where: { status: "activa" } }),
  ]);
  return (
    <div className="page">
      <div className="eyebrow">Administración · Equipo {brandLabel()}</div>
      <AdminTabs counts={{ solicitudes: req, invitaciones: inv, publicaciones: pubs, accesos: acc, busquedas: bus }} />
      {children}
    </div>
  );
}
