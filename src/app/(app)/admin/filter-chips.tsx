import Link from "next/link";

export function FilterChips({ base, param, current, options, def = "todas" }: { base: string; param: string; current: string; options: [string, string, number?][]; def?: string }) {
  return (
    <div className="chips mb-16" role="group" aria-label="Filtrar">
      {options.map(([k, label, n]) => (
        <Link key={k} href={k === def ? base : `${base}${base.includes("?") ? "&" : "?"}${param}=${k}`} className={"chip" + (current === k ? " chip-on" : "")} aria-current={current === k ? "page" : undefined} style={{ textDecoration: "none", minHeight: 36, fontSize: 14 }}>
          {label}{n !== undefined ? ` · ${n}` : ""}
        </Link>
      ))}
    </div>
  );
}
