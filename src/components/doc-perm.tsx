"use client";

import { useTransition } from "react";
import { toast } from "./toast";

/** Cambia categoría y permiso de un documento; se guarda al cambiar cualquier selector. */
export function DocPermForm({
  action,
  category,
  permission,
  categories,
}: {
  action: (fd: FormData) => Promise<{ error?: string; message?: string }>;
  category: string;
  permission: string;
  categories: readonly string[];
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="hstack gap-8"
      style={{ flexWrap: "wrap" }}
      onChange={(e) => {
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(fd);
          toast(r.error ?? r.message ?? "Guardado.");
        });
      }}
      onSubmit={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <label className="sr-only" htmlFor={`c-${category}`}>Categoría</label>
      <select name="category" defaultValue={category} className="select" style={{ height: 36, width: "auto", fontSize: 14 }} disabled={pending} aria-label="Categoría">
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select name="permission" defaultValue={permission} className="select" style={{ height: 36, width: "auto", fontSize: 14 }} disabled={pending} aria-label="Permiso">
        <option value="descarga">Autorizados · ver y descargar</option>
        <option value="lectura">Autorizados · solo lectura</option>
        <option value="restringido">Restringido · por solicitud</option>
      </select>
      {pending && <span className="spinner" aria-label="Guardando" />}
    </form>
  );
}
