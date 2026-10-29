import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createMyBuySearchAction } from "@/app/actions/buy-search";
import { BuySearchForm } from "@/components/buy-search-form";

export const metadata: Metadata = { title: "Nueva búsqueda" };

export default async function NuevaBusqueda() {
  const user = await requireMember();
  if (user.isAdmin) redirect("/admin/busquedas/nueva");
  if (!user.canBuy) redirect("/venta");
  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div className="eyebrow">Compra · Mis búsquedas</div>
      <h1 className="h1-lg" style={{ margin: "12px 0 28px" }}>Nueva búsqueda</h1>
      <div className="card card-pad">
        <p className="c-lead mb-24">Describa la empresa que busca comprar. Su búsqueda es privada: solo la ven usted y nuestro equipo, nunca los vendedores.</p>
        <BuySearchForm action={createMyBuySearchAction} buyer />
      </div>
    </div>
  );
}
