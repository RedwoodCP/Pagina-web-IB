import Link from "next/link";

const platformName = () => process.env.PLATFORM_NAME || "";

/** Marca sobre fondo oscuro o claro. Usa el logotipo oficial; nunca se redibuja. */
export function Brand({ dark, href = "/", compact }: { dark?: boolean; href?: string; compact?: boolean }) {
  const name = platformName();
  return (
    <Link href={href} className="brand-text" aria-label={name ? `${name}, inicio` : "Redwood Capital Partners, inicio"}>
      {name ? (
        <>
          <div className="brand-name">{name}</div>
          <div className="brand-by" style={{ color: dark ? "#AEAEAE" : "#585858" }}>
            Por Redwood Capital Partners
          </div>
        </>
      ) : (
        <img
          src={dark ? "/brand/redwood-logo-blanco.png" : "/brand/redwood-logo.png"}
          alt="Redwood Capital Partners"
          style={{ height: compact ? 26 : 34, width: "auto", display: "block" }}
        />
      )}
    </Link>
  );
}

export function brandLabel() {
  return platformName() || "Redwood Capital Partners";
}
