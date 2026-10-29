import type { Metadata } from "next";
import { createBuySearchAction } from "@/app/actions/buy-search";
import { BuySearchForm } from "../search-form";

export const metadata: Metadata = { title: "Nueva búsqueda de compra" };

export default function NuevaBusqueda() {
  return (
    <div className="card card-pad">
      <h2 className="h2">Nueva búsqueda de compra</h2>
      <p className="c-lead mt-8 mb-24">Registre qué empresa busca comprar un cliente. La plataforma la cruza con las oportunidades publicadas. Es de uso interno: compradores y vendedores no la ven.</p>
      <BuySearchForm action={createBuySearchAction} />
    </div>
  );
}
