import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { Empty } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { markNotificationsReadAction } from "@/app/actions/profile";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function Notificaciones() {
  const u = await requireUser();
  const rows = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = rows.filter((r) => !r.readAt).length;
  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cuenta</div>
          <h1 className="h1-lg" style={{ marginTop: 12 }}>Notificaciones</h1>
        </div>
        {unread > 0 && <ActionButton action={markNotificationsReadAction} icon="done_all">Marcar todas como leídas</ActionButton>}
      </div>
      {rows.length === 0 ? (
        <Empty icon="notifications" title="Sin notificaciones" text="Aquí verá decisiones de acceso, respuestas y avisos de revisión." />
      ) : (
        <div className="card rows">
          {rows.map((n) => (
            <div key={n.id} className="row">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.readAt ? "transparent" : "#1A1A1A", flex: "none" }} aria-label={n.readAt ? undefined : "Sin leer"} />
              <div className="row-main">
                {n.href ? <Link href={n.href} style={{ color: "inherit" }}>{n.text}</Link> : n.text}
                <div className="small c-lead mt-4">{fmtDateTime(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
