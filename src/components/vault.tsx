"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Transición «bóveda» entre la landing y las páginas de acceso: la landing cierra las puertas
// (landing-motion) y deja esta marca; la página de destino las abre al montarse.
export const VAULT_FLAG = "rw-vault";

export function VaultMarkup({ open }: { open?: boolean }) {
  return (
    <div className={"vault" + (open ? " is-open" : "")} aria-hidden="true">
      <div className="vault-door vault-l" />
      <div className="vault-door vault-r" />
      <div className="vault-seal"><img src="/brand/rw-isotipo-blanco.png" alt="" /></div>
    </div>
  );
}

/** En las páginas de acceso: si se llegó desde la landing con la transición, abre las puertas. */
export function VaultOpen() {
  const [state, setState] = useState<"none" | "closed" | "open">("none");
  // Antes del primer cuadro: así las puertas aparecen cerradas sin parpadeo (y sin desajuste con el HTML del servidor).
  useLayoutEffect(() => {
    let flag = false;
    try {
      flag = sessionStorage.getItem(VAULT_FLAG) === "1";
      sessionStorage.removeItem(VAULT_FLAG);
    } catch {}
    if (flag && !matchMedia("(prefers-reduced-motion: reduce)").matches) setState("closed");
  }, []);
  useEffect(() => {
    if (state !== "closed") return;
    const a = setTimeout(() => setState("open"), 120);
    return () => clearTimeout(a);
  }, [state]);
  useEffect(() => {
    if (state !== "open") return;
    const b = setTimeout(() => setState("none"), 1000);
    return () => clearTimeout(b);
  }, [state]);
  if (state === "none") return null;
  return <VaultMarkup open={state === "open"} />;
}
