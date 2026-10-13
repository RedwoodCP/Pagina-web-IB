import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { ACCESS_BADGE, NDA_BADGE, SECTOR_ICON } from "@/lib/domain";
import { fmtMoney, fmtPct, fmtRange } from "@/lib/format";
import { Badge, DemoFlag, Icon } from "./ui";
import { ActionButton } from "./confirm";
import { requestInfoAction, toggleFavoriteAction } from "@/app/actions/buyer";

export function priceText(o: { hidden: { price: boolean }; negotiable: boolean; priceMin: number | null; priceMax: number | null; currency: string }) {
  if (o.hidden.price) return null;
  if (o.negotiable) return "A negociar";
  return fmtRange(o.priceMin, o.priceMax, o.currency);
}

function Conf() {
  return (
    <dd className="conf">
      <Icon name="lock" size={15} />
      Confidencial
    </dd>
  );
}

/** Estado del proceso del usuario con la oportunidad. */
export function processBadge(o: { nda: string; access: string; ndaMethod?: string | null }) {
  if (o.nda === "none") return null;
  if (o.nda === "pendiente_firma") return NDA_BADGE.pendiente_firma!;
  return ACCESS_BADGE[o.access] ?? ACCESS_BADGE.none!;
}

export function FavButton({ code, saved }: { code: string; saved: boolean }) {
  return (
    <ActionButton action={toggleFavoriteAction.bind(null, code)} className="btn btn-icon" icon={saved ? "bookmark_added" : "bookmark"}>
      <span className="sr-only">{saved ? `Quitar ${code} de favoritas` : `Guardar ${code} en favoritas`}</span>
    </ActionButton>
  );
}

export function ProcessCta({ o, isAdmin }: { o: CatalogItem; isAdmin: boolean }) {
  const base = `/oportunidades/${o.code}`;
  if (o.isOwn) return <Link prefetch={false} href={`/venta/${o.id}`} className="btn btn-secondary"><Icon name="storefront" />Gestionar</Link>;
  if (isAdmin) return null;
  if (o.nda === "none")
    return (
      <ActionButton action={requestInfoAction.bind(null, o.code)} className="btn btn-secondary" icon="mail">
        Solicitar información
      </ActionButton>
    );
  if (o.nda === "pendiente_firma") return <Link prefetch={false} href={`${base}/nda`} className="btn btn-secondary"><Icon name="edit_document" />Firmar NDA</Link>;
  if (o.access === "autorizado") return <Link prefetch={false} href={`${base}/espacio`} className="btn btn-secondary"><Icon name="lock_open" />Abrir espacio privado</Link>;
  return <Link prefetch={false} href={`${base}/nda`} className="btn btn-secondary"><Icon name="schedule" />Ver estado</Link>;
}

export function OpportunityCard({ o, isAdmin }: { o: CatalogItem; isAdmin: boolean }) {
  const pb = processBadge(o);
  const price = priceText(o);
  return (
    <article className="opp" aria-labelledby={`t-${o.code}`}>
      <div className="opp-art">
        <Icon name={SECTOR_ICON[o.sector ?? ""] ?? "domain"} size={34} />
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, textTransform: "uppercase" }}>{o.sector}</div>
          <div style={{ fontSize: 12, color: "#F0F0F0", marginTop: 4 }}>Imagen genérica · sin datos identificables</div>
        </div>
      </div>
      <div className="opp-body">
        <div className="opp-head">
          <div className="wrap-gap" style={{ gap: 10 }}>
            <Link prefetch={false} href={`/oportunidades/${o.code}`} className="opp-code" id={`t-${o.code}`}>{o.code}</Link>
            {pb && <Badge b={pb} />}
            {o.isOwn && <span className="badge badge-dark"><Icon name="storefront" />Su publicación</span>}
            {o.isDemo && <DemoFlag />}
          </div>
          <div className="hstack gap-8" style={{ alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "#585858" }}>Ventas anuales ({o.currency})</span>
            <span aria-hidden="true" style={{ color: "#828282" }}>·</span>
            {o.sales == null ? (
              <span className="hstack gap-4 c-lead"><Icon name="lock" size={16} />Confidencial</span>
            ) : (
              <span className="num" style={{ fontSize: 21, fontWeight: 700 }}>{fmtMoney(o.sales, o.currency)}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px", flex: 1 }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35, marginBottom: 6 }}>{o.title}</div>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "#444" }}>{o.summary}</p>
          </div>
          <dl className="opp-dl">
            <div><dt>EBITDA ({o.currency})</dt>{o.ebitda == null ? <Conf /> : <dd>{fmtMoney(o.ebitda, o.currency)}</dd>}</div>
            <div><dt>Margen EBITDA</dt>{o.margin == null ? <Conf /> : <dd>{fmtPct(o.margin)}</dd>}</div>
            <div><dt>Precio indicativo</dt>{price == null ? <Conf /> : <dd>{price}</dd>}</div>
            <div><dt>Ubicación</dt><dd style={{ fontVariantNumeric: "normal" }}>{o.region}, {o.country}</dd></div>
          </dl>
        </div>
        <div className="hstack between gap-12" style={{ flexWrap: "wrap" }}>
          <div className="wrap-gap" style={{ gap: 6 }}>
            <span className="tag">{o.dealType}</span>
            <span className="tag tag-outline">{o.hasTeaser ? "Teaser disponible" : "Sin teaser"}</span>
          </div>
          <div className="wrap-gap">
            {!isAdmin && !o.isOwn && <FavButton code={o.code} saved={o.saved} />}
            <ProcessCta o={o} isAdmin={isAdmin} />
            <Link prefetch={false} href={`/oportunidades/${o.code}`} className="btn" style={{ padding: "0 24px" }}>Ver más</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
