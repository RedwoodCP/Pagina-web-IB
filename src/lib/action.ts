// Contrato común de las Server Actions de formularios.
export type ActionState = {
  ok?: boolean;
  /** mensaje general (banner de error) */
  error?: string;
  /** errores por campo */
  fields?: Record<string, string>;
  /** valores enviados, para repoblar el formulario tras un error */
  values?: Record<string, string>;
  /** aviso breve de éxito */
  message?: string;
};

export const initialState: ActionState = {};

export function formValues(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k.startsWith("$")) continue;
    // las contraseñas nunca se devuelven al cliente
    if (/pass/i.test(k)) continue;
    o[k] = o[k] !== undefined ? o[k] + "," + v : v;
  }
  return o;
}

export function str(fd: FormData, k: string, max = 2000): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function num(fd: FormData, k: string): number | null {
  const v = str(fd, k).replace(/,/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function invalid(fields: Record<string, string>, fd: FormData, error = "Revise los campos marcados."): ActionState {
  return { error, fields, values: formValues(fd) };
}
