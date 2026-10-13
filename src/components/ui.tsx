import type { ReactNode } from "react";
import type { Badge as BadgeT } from "@/lib/domain";

export function Icon({ name, size, className }: { name: string; size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={"ms" + (className ? " " + className : "")} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}

/** Estado: siempre ícono + texto. */
export function Badge({ b, title }: { b: BadgeT; title?: string }) {
  return (
    <span className={`badge badge-${b.tone}`} title={title}>
      <Icon name={b.icon} />
      {b.label}
    </span>
  );
}

export function DemoFlag() {
  return (
    <span className="demo-flag" title="Datos de demostración: empresa y cifras ficticias">
      Demo
    </span>
  );
}

export function Empty({
  icon = "inbox",
  title,
  text,
  children,
}: {
  icon?: string;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="empty" role="status">
      <Icon name={icon} />
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {children}
    </div>
  );
}

export function Banner({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "err";
  icon?: string;
  children: ReactNode;
}) {
  const ic = icon ?? { info: "info", ok: "check_circle", warn: "warning", err: "error" }[tone];
  return (
    <div className={`form-banner ${tone === "err" ? "" : tone}`} role={tone === "err" ? "alert" : "status"}>
      <Icon name={ic} />
      <div>{children}</div>
    </div>
  );
}

export function Metric({ label, value, hidden, sub }: { label: string; value: ReactNode; hidden?: boolean; sub?: ReactNode }) {
  return (
    <div>
      <div className="metric-label">{label}</div>
      {hidden ? (
        <div className="metric-value conf">
          <Icon name="lock" size={18} />
          Confidencial
        </div>
      ) : (
        <div className="metric-value">{value}</div>
      )}
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="h1-lg" style={{ marginTop: eyebrow ? 12 : 0 }}>
          {title}
        </h1>
        {lead && (
          <p className="lead" style={{ marginTop: 8 }}>
            {lead}
          </p>
        )}
      </div>
      {children && <div className="wrap-gap">{children}</div>}
    </div>
  );
}
