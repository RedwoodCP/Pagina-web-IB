import Link from "next/link";
import { fmtDateTime } from "@/lib/format";
import { Empty, Icon } from "@/components/ui";

type Resp = {
  id: string;
  message: string;
  createdAt: Date;
  listing: { code: string; title: string | null } | null;
  responder: { name: string; email: string };
};

/** Propuestas de vendedores. El comprador no ve quién propone; administración sí. */
export function BuyResponses({ items, admin }: { items: Resp[]; admin?: boolean }) {
  return (
    <section className="mt-32">
      <h2 className="h3 mb-8"><Icon name="handshake" /> Propuestas de vendedores · {items.length}</h2>
      <p className="small c-lead mb-16">
        {admin ? "Empresas que vendedores y asesores propusieron para esta búsqueda." : "Empresas que vendedores de la red le proponen. Su identidad y la de la empresa se mantienen protegidas hasta que el vendedor autorice su acceso."}
      </p>
      {items.length === 0 ? (
        <Empty icon="inbox" title="Aún no hay propuestas" text="Aparecerán aquí cuando un vendedor responda a esta búsqueda publicada." />
      ) : (
        <div className="card rows">
          {items.map((r) => (
            <div key={r.id} className="row" style={{ alignItems: "flex-start" }}>
              <div className="row-main">
                <div className="small fw7">{r.listing ? `Oportunidad ${r.listing.code}` : "Empresa aún no publicada"}</div>
                {r.listing?.title && <div className="fw6 mt-4">{r.listing.title}</div>}
                <p className="mt-8" style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
                <div className="small c-lead mt-8">{admin ? `${r.responder.name} (${r.responder.email})` : "Un vendedor de la red"} · {fmtDateTime(r.createdAt)}</div>
              </div>
              {r.listing && <Link prefetch={false} href={`/oportunidades/${r.listing.code}`} className="btn btn-secondary btn-sm">Ver oportunidad</Link>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
