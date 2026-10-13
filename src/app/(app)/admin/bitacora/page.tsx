import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ACTION_LABEL } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
import { Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Bitácora" };
const PAGE = 50;

export default async function Bitacora({ searchParams }: { searchParams: Promise<{ accion?: string; p?: string; op?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const listing = sp.op ? await db.listing.findUnique({ where: { code: sp.op }, select: { id: true } }) : null;
  const where = { ...(sp.accion ? { action: { startsWith: sp.accion } } : {}), ...(sp.op ? { listingId: listing?.id ?? "-" } : {}) };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
  ]);
  const listings = await db.listing.findMany({ where: { id: { in: rows.map((r) => r.listingId).filter(Boolean) as string[] } }, select: { id: true, code: true } });
  const codeOf = (id: string | null) => listings.find((l) => l.id === id)?.code;
  const groups = [["", "Todas"], ["auth", "Sesiones"], ["membership", "Membresías"], ["invitation", "Invitaciones"], ["listing", "Publicaciones"], ["nda", "NDA"], ["access", "Accesos"], ["document", "Documentos"], ["user", "Usuarios"]];
  const qs = (o: Record<string, string | number | undefined>) => "?" + new URLSearchParams(Object.entries({ accion: sp.accion, op: sp.op, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  return (
    <>
      <form className="wrap-gap mb-16" style={{ gap: 12 }}>
        <select name="accion" defaultValue={sp.accion ?? ""} className="select" style={{ width: "auto" }} aria-label="Tipo de acción">
          {groups.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input name="op" defaultValue={sp.op ?? ""} className="input" placeholder="Oportunidad (RW-####)" style={{ width: 200 }} aria-label="Oportunidad" />
        <button className="btn btn-secondary">Filtrar</button>
        <span className="small c-lead">{total} registros · La bitácora no puede editarse desde la plataforma.</span>
      </form>
      {rows.length === 0 ? (
        <Empty icon="history" title="Sin registros" />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table table-stack">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Oportunidad</th><th>Detalle</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="num nowrap small">{fmtDateTime(r.createdAt)}</td>
                  <td className="small">{r.actor?.name ?? "Sistema / anónimo"}</td>
                  <td>{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td data-label="Oportunidad" className="small">{codeOf(r.listingId) ?? "—"}</td>
                  <td className="small c-lead" style={{ maxWidth: 320, wordBreak: "break-word" }}>{r.meta !== "{}" ? r.meta : ""}</td>
                  <td className="small c-lead num">{r.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="hstack gap-8 mt-16">
        {page > 1 && <Link className="btn btn-secondary btn-sm" href={qs({ p: page - 1 })}>Anterior</Link>}
        {page * PAGE < total && <Link className="btn btn-secondary btn-sm" href={qs({ p: page + 1 })}>Siguiente</Link>}
      </div>
    </>
  );
}
