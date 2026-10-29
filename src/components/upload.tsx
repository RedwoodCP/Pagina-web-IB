"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { ActionState } from "@/lib/action";
import { toast } from "./toast";
import { useEffect } from "react";

/** Carga de archivo con validación en cliente (tamaño/extensión) y validación definitiva en servidor. */
export function UploadForm({
  action,
  accept,
  teaser,
  categories,
  label,
  hint,
  maxMb = 25,
  submitLabel,
  autoSubmit,
}: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>;
  accept: string;
  teaser?: boolean;
  categories?: readonly string[];
  label: string;
  hint: string;
  maxMb?: number;
  submitLabel?: string;
  /** Sube el archivo en cuanto se elige (teaser y NDA: un solo archivo, sin más opciones). */
  autoSubmit?: boolean;
}) {
  // Si la petición falla antes de llegar a la acción (archivo demasiado grande para el servidor,
  // conexión), se muestra un error en lugar de dejar el formulario como si nada hubiera pasado.
  const [state, run, pending] = useActionState(async (p: ActionState, fd: FormData): Promise<ActionState> => {
    try {
      return await action(p, fd);
    } catch {
      return { error: `No se pudo cargar el archivo. Verifique que pese menos de ${maxMb} MB y su conexión, e intente de nuevo.` };
    }
  }, {});
  const [name, setName] = useState<string | null>(null);
  const [clientErr, setClientErr] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) {
      toast(state.message);
      setName(null);
      ref.current?.reset();
    }
  }, [state]);
  const err = clientErr ?? state.fields?.file ?? state.error;
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); if (pending) return; const fd = new FormData(e.currentTarget); startTransition(() => run(fd)); }} className="stack gap-12">
      <label className={"dropzone" + (err ? " err" : "")}>
        <input
          type="file"
          name="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setClientErr(null);
            if (!f) return setName(null);
            const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
            if (!accept.split(",").includes("." + ext)) setClientErr(`Formato no admitido (.${ext}). Use ${accept.replaceAll(",", ", ")}.`);
            else if (f.size > maxMb * 1024 * 1024) setClientErr(`El archivo supera ${maxMb} MB.`);
            setName(f.name);
            if (autoSubmit && accept.split(",").includes("." + ext) && f.size <= maxMb * 1024 * 1024) {
              const fd = new FormData(e.currentTarget.form!);
              startTransition(() => run(fd));
            }
          }}
        />
        <span aria-hidden="true" className="ms" style={{ fontSize: 26 }}>upload_file</span>
        <span className="fw6">{pending ? `Cargando ${name ?? "archivo"}…` : name ?? label}</span>
        <span className="small c-lead">{hint}</span>
      </label>
      {err && <div className="field-error" role="alert"><span aria-hidden="true" className="ms">error</span>{err}</div>}
      {!teaser && categories && (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="cat">Categoría</label>
            <select id="cat" name="category" className="select" defaultValue="Financiera">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="perm">Permiso para compradores autorizados</label>
            <select id="perm" name="permission" className="select" defaultValue="lectura">
              <option value="descarga">Ver y descargar</option>
              <option value="lectura">Solo lectura (visor)</option>
              <option value="restringido">Restringido (por solicitud)</option>
            </select>
          </div>
        </div>
      )}
      <div>
        <button className="btn btn-secondary" disabled={pending || !name || !!clientErr} aria-busy={pending || undefined}>
          {pending ? <span className="spinner" /> : <span aria-hidden="true" className="ms">upload</span>}
          {pending ? "Cargando y verificando…" : submitLabel ?? (teaser ? "Cargar teaser" : "Cargar documento")}
        </button>
      </div>
    </form>
  );
}
