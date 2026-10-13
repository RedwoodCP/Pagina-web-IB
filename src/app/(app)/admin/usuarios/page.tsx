import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { DemoFlag, Icon } from "@/components/ui";
import { ActionButton } from "@/components/confirm";
import { setUserStatusAction, updateUserAction } from "@/app/actions/admin";
import { UserPerms } from "./user-perms";

export const metadata: Metadata = { title: "Usuarios y permisos" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const me = await getCurrentUser();
  const users = (await db.user.findMany({ include: { organization: true, _count: { select: { listings: true, engagements: true } } }, orderBy: { createdAt: "desc" } })).filter(
    (u) => !q || `${u.name} ${u.email} ${u.organization?.name ?? ""}`.toLowerCase().includes(q),
  );
  return (
    <>
      <form className="hstack gap-8 mb-16" role="search">
        <label className="sr-only" htmlFor="uq">Buscar usuario</label>
        <input id="uq" name="q" defaultValue={q} className="input" placeholder="Buscar por nombre, correo u organización" style={{ maxWidth: 420 }} />
        <button className="btn btn-secondary"><Icon name="search" />Buscar</button>
      </form>
      <div className="card rows">
        {users.map((u) => (
          <div key={u.id} className="row" style={{ alignItems: "flex-start" }}>
            <div className="row-main">
              <div className="hstack gap-8 fw6" style={{ fontSize: 16 }}>{u.name}{u.isDemo && <DemoFlag />}{u.status === "suspendido" && <span className="badge badge-err"><Icon name="block" />Suspendido</span>}</div>
              <div className="small c-lead mt-4">{u.email} · {u.organization?.name ?? "Sin organización"} · Alta {fmtDate(u.createdAt)} · Último acceso {fmtDate(u.lastLoginAt)}</div>
              <div className="small c-lead">{u._count.listings} publicaciones · {u._count.engagements} procesos de compra{u.onboardingDone ? "" : " · Perfil sin completar"}</div>
            </div>
            <UserPerms action={updateUserAction.bind(null, u.id)} v={{ canBuy: u.canBuy, canSell: u.canSell, isAdvisor: u.isAdvisor, isAdmin: u.isAdmin }} />
            {u.id !== me?.id &&
              (u.status === "activo" ? (
                <ActionButton action={setUserStatusAction.bind(null, u.id, "suspendido")} danger confirm={{ title: `Suspender a ${u.name}`, body: "Se cerrarán sus sesiones y no podrá iniciar sesión. Sus procesos y publicaciones se conservan." }} confirmLabel="Suspender" reason reasonLabel="Motivo">Suspender</ActionButton>
              ) : (
                <ActionButton action={setUserStatusAction.bind(null, u.id, "activo")}>Reactivar</ActionButton>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
