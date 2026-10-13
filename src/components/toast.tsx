"use client";

import { useEffect, useState } from "react";

const EVT = "rw-toast";

/** Muestra un aviso breve. Puede llamarse desde cualquier componente cliente. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: message }));
}

/** Contenedor de avisos. Lee además el aviso «flash» que dejan las acciones con redirección. */
export function ToastHost({ flash }: { flash?: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = (m: string) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 4200);
    };
    const on = (e: Event) => show((e as CustomEvent<string>).detail);
    window.addEventListener(EVT, on);
    if (flash) {
      show(flash);
      document.cookie = "rw_flash=; Max-Age=0; path=/";
    }
    return () => {
      window.removeEventListener(EVT, on);
      clearTimeout(t);
    };
  }, [flash]);
  return (
    <div aria-live="polite" role="status">
      {msg && (
        <div className="toast">
          <span className="ms">info</span>
          <span>{msg}</span>
          <button
            onClick={() => setMsg(null)}
            aria-label="Cerrar aviso"
            style={{ background: "none", border: 0, color: "#AEAEAE", cursor: "pointer", padding: 2, marginLeft: 4 }}
          >
            <span className="ms" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
