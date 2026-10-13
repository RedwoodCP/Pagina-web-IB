"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

type Opt = { value: string; label: string };
export type Group = { key: string; title: string; icon: string; note?: string; options: Opt[]; single?: boolean };

/** Barra de búsqueda, filtros y orden del catálogo. El estado vive en la URL. */
export function CatalogControls({ groups, children, count }: { groups: Group[]; children: ReactNode; count: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrap = useRef<HTMLDivElement>(null);

  const values = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  function push(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    start(() => router.replace(`${path}?${p.toString()}`, { scroll: false }));
  }
  function toggle(k: string, v: string, single?: boolean) {
    push((p) => {
      const cur = values(k);
      const next = single ? (cur[0] === v ? [] : [v]) : cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (next.length) p.set(k, next.join(","));
      else p.delete(k);
    });
  }
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const active: { label: string; rm: () => void }[] = [];
  if (sp.get("q")) active.push({ label: `Búsqueda: “${sp.get("q")}”`, rm: () => { setQ(""); push((p) => p.delete("q")); } });
  if (sp.get("favoritas")) active.push({ label: "Solo favoritas", rm: () => push((p) => p.delete("favoritas")) });
  for (const g of groups)
    for (const v of values(g.key)) {
      const o = g.options.find((x) => x.value === v);
      if (o) active.push({ label: (g.single || ["ventas", "ebitda", "margen"].includes(g.key) ? g.title + " " : "") + o.label, rm: () => toggle(g.key, v, g.single) });
    }
  const nActive = active.length;
  const currency = sp.get("moneda") === "MXN" ? "MXN" : "USD";

  return (
    <>
      <div className="hstack gap-12" style={{ flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 320px", position: "relative", display: "block" }}>
          <span className="sr-only">Buscar oportunidades</span>
          <span className="ms" style={{ position: "absolute", left: 14, top: 12, fontSize: 22, color: "#585858" }}>search</span>
          <input
            className="input"
            style={{ height: 48, paddingLeft: 46, fontSize: 15 }}
            placeholder="Buscar por sector, región, identificador o palabra clave"
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              clearTimeout(t.current);
              t.current = setTimeout(() => push((p) => (v.trim() ? p.set("q", v.trim()) : p.delete("q"))), 350);
            }}
          />
        </label>
        <label className="hstack gap-8" style={{ fontSize: 14, color: "#585858" }}>
          Moneda
          <select className="select" style={{ height: 48, width: "auto" }} value={currency} onChange={(e) => push((p) => (e.target.value === "USD" ? p.delete("moneda") : p.set("moneda", e.target.value)))}>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </select>
        </label>
        <label className="hstack gap-8" style={{ fontSize: 14, color: "#585858" }}>
          Ordenar
          <select className="select" style={{ height: 48, width: "auto" }} value={sp.get("orden") ?? "reciente"} onChange={(e) => push((p) => (e.target.value === "reciente" ? p.delete("orden") : p.set("orden", e.target.value)))}>
            <option value="reciente">Más recientes</option>
            <option value="ventas">Mayores ventas</option>
            <option value="ebitda">Mayor EBITDA</option>
            <option value="margen">Mayor margen EBITDA</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-block mobile-only mt-12"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ justifyContent: "space-between" }}
      >
        <span className="hstack gap-8"><span className="ms">tune</span>Filtros{nActive ? ` · ${nActive}` : ""}</span>
        <span className="ms">{mobileOpen ? "expand_less" : "expand_more"}</span>
      </button>

      <div ref={wrap} className={"filters" + (mobileOpen ? " open" : "")} aria-label="Filtros" role="group">
        {groups.map((g) => {
          const sel = values(g.key);
          const isOpen = open === g.key;
          return (
            <div key={g.key} className="dropdown filter">
              <button
                type="button"
                className={"filter-btn" + (sel.length ? " on" : "")}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : g.key)}
              >
                <span className="ms" style={{ fontSize: 18 }}>{g.icon}</span>
                <span className="grow ellipsis">{g.title}{sel.length ? ` · ${sel.length}` : ""}</span>
                <span className="ms" style={{ fontSize: 18 }}>{isOpen ? "expand_less" : "expand_more"}</span>
              </button>
              {isOpen && (
                <div className={"dd-panel" + (g.key === "precio" || g.key === "ventas" ? " right" : "")} role="group" aria-label={g.title}>
                  {g.note && <div className="dd-note">{g.note}</div>}
                  {g.options.map((o) => {
                    const on = sel.includes(o.value);
                    return (
                      <button key={o.value} type="button" className="dd-item" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(g.key, o.value, g.single)}>
                        <span className="ms">{on ? "check_box" : "check_box_outline_blank"}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nActive > 0 && (
        <div className="wrap-gap mt-16">
          <span className="small c-lead" style={{ marginRight: 4 }}>Filtros activos:</span>
          {active.map((a) => (
            <button key={a.label} type="button" onClick={a.rm} className="active-filter" aria-label={`Quitar filtro ${a.label}`}>
              {a.label}
              <span className="ms" style={{ fontSize: 16 }}>close</span>
            </button>
          ))}
          <button type="button" className="btn-link small" style={{ background: "none", border: 0, cursor: "pointer", padding: "0 6px" }} onClick={() => { setQ(""); start(() => router.replace(path, { scroll: false })); }}>
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="small c-lead mt-16" aria-live="polite">
        {pending ? "Actualizando…" : `${count} ${count === 1 ? "oportunidad" : "oportunidades"}`}
      </div>

      <div className="mt-16" aria-busy={pending}>
        {pending ? (
          <div className="stack gap-16" aria-label="Cargando oportunidades">
            {[0, 1].map((i) => (
              <div key={i} className="card skel-card" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="skel" style={{ width: "30%", height: 12 }} />
                <div className="skel" style={{ width: "70%", height: 20 }} />
                <div className="skel" style={{ width: "90%", height: 12 }} />
                <div className="hstack gap-16" style={{ marginTop: "auto" }}>
                  <div className="skel grow" style={{ height: 36 }} />
                  <div className="skel grow" style={{ height: 36 }} />
                  <div className="skel grow" style={{ height: 36 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}
