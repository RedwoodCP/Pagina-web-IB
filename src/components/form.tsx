"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";
import { toast } from "./toast";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
type Ctx = ActionState & { $pending?: boolean; $submitter?: string | null; $inForm?: boolean };
const Ctx = createContext<Ctx>({});

/**
 * Formulario conectado a una Server Action con errores por campo, banner y aviso de éxito.
 * Se envía con onSubmit (no con la prop action) para que React no reinicie los campos tras
 * un error de validación: el usuario conserva lo que escribió. resetOnSuccess limpia al terminar bien.
 */
export function ActionForm({
  action,
  children,
  className,
  id,
  noBanner,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  id?: string;
  noBanner?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [submitter, setSubmitter] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) toast(state.message);
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <Ctx.Provider value={{ ...state, $pending: pending, $submitter: submitter, $inForm: true }}>
      <form
        ref={ref}
        className={className}
        id={id}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, sub ?? undefined);
          setSubmitter(sub?.name ? `${sub.name}=${sub.value}` : null);
          startTransition(() => dispatch(fd));
        }}
      >
        {state.error && !noBanner && (
          <div className="form-banner mb-16" role="alert">
            <span aria-hidden="true" className="ms">error</span>
            <div>{state.error}</div>
          </div>
        )}
        {children}
      </form>
    </Ctx.Provider>
  );
}

export function useFormState() {
  return useContext(Ctx);
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <div className="field-error" id={id}>
      <span aria-hidden="true" className="ms">error</span>
      {msg}
    </div>
  );
}

type Common = {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  icon?: string;
  className?: string;
};

export function Field({
  name,
  label,
  hint,
  required,
  optional,
  icon,
  className,
  defaultValue,
  ...rest
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const s = useFormState();
  const id = useId();
  const err = s.fields?.[name];
  const dv = s.values && name in s.values ? s.values[name] : defaultValue;
  return (
    <div className={"field " + (className ?? "")}>
      {label && (
        <label htmlFor={id}>
          {icon && <span aria-hidden="true" className="ms" style={{ fontSize: 16 }}>{icon}</span>}
          {label}
          {required && " *"}
          {optional && <span className="opt">(opcional)</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        className="input"
        defaultValue={dv as string}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? id + "-e" : hint ? id + "-h" : undefined}
        required={required}
        {...rest}
      />
      <FieldError id={id + "-e"} msg={err} />
      {hint && !err && <div className="field-hint" id={id + "-h"}>{hint}</div>}
    </div>
  );
}

export function TextArea({
  name,
  label,
  hint,
  required,
  optional,
  className,
  defaultValue,
  ...rest
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const s = useFormState();
  const id = useId();
  const err = s.fields?.[name];
  const dv = s.values && name in s.values ? s.values[name] : defaultValue;
  return (
    <div className={"field " + (className ?? "")}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && " *"}
          {optional && <span className="opt">(opcional)</span>}
        </label>
      )}
      <textarea id={id} name={name} className="textarea" defaultValue={dv as string} aria-invalid={err ? true : undefined} aria-describedby={err ? id + "-e" : undefined} {...rest} />
      <FieldError id={id + "-e"} msg={err} />
      {hint && !err && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Select({
  name,
  label,
  hint,
  required,
  optional,
  icon,
  className,
  options,
  placeholder,
  defaultValue,
  ...rest
}: Common & {
  options: (string | [string, string])[];
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const s = useFormState();
  const id = useId();
  const err = s.fields?.[name];
  const dv = s.values && name in s.values ? s.values[name] : (defaultValue ?? (placeholder ? "" : undefined));
  return (
    <div className={"field " + (className ?? "")}>
      {label && (
        <label htmlFor={id}>
          {icon && <span aria-hidden="true" className="ms" style={{ fontSize: 16 }}>{icon}</span>}
          {label}
          {required && " *"}
          {optional && <span className="opt">(opcional)</span>}
        </label>
      )}
      <select id={id} name={name} className="select" defaultValue={dv as string} aria-invalid={err ? true : undefined} aria-describedby={err ? id + "-e" : undefined} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <FieldError id={id + "-e"} msg={err} />
      {hint && !err && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Check({ name, children, defaultChecked, value = "on" }: { name: string; children: ReactNode; defaultChecked?: boolean; value?: string }) {
  const s = useFormState();
  const err = s.fields?.[name];
  const id = useId();
  const dc = s.values ? s.values[name] === value || (s.values[name] ?? "").split(",").includes(value) : defaultChecked;
  return (
    <div className="field">
      <label className="check">
        <input type="checkbox" name={name} value={value} defaultChecked={dc} aria-invalid={err ? true : undefined} aria-describedby={err ? id : undefined} />
        <span>{children}</span>
      </label>
      <FieldError id={id} msg={err} />
    </div>
  );
}

/** Grupo de chips. multiple=true → casillas; false → radio. */
export function ChipGroup({
  name,
  label,
  options,
  multiple,
  defaultValue,
  required,
  hint,
}: {
  name: string;
  label?: ReactNode;
  options: (string | [string, string])[];
  multiple?: boolean;
  defaultValue?: string | string[];
  required?: boolean;
  hint?: ReactNode;
}) {
  const s = useFormState();
  const err = s.fields?.[name];
  const id = useId();
  const sel: string[] =
    s.values && name in s.values
      ? s.values[name]!.split(",")
      : s.values
        ? []
        : Array.isArray(defaultValue)
          ? defaultValue
          : defaultValue
            ? [defaultValue]
            : [];
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={err ? id : undefined}>
      {label && (
        <legend className="field-label" style={{ marginBottom: 10, padding: 0 }}>
          {label}
          {required && " *"}
        </legend>
      )}
      <div className="chips">
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <label key={v} className="chip">
              <input type={multiple ? "checkbox" : "radio"} name={name} value={v} defaultChecked={sel.includes(v)} />
              {l}
            </label>
          );
        })}
      </div>
      <FieldError id={id} msg={err} />
      {hint && !err && <div className="field-hint">{hint}</div>}
    </fieldset>
  );
}

export function Submit({
  children,
  pendingText,
  className = "btn",
  icon,
  name,
  value,
  formNoValidate,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  icon?: string;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
}) {
  const ctx = useContext(Ctx);
  const st = useFormStatus();
  const pending = ctx.$inForm ? !!ctx.$pending : st.pending;
  const mine = pending && (!name || (ctx.$inForm ? ctx.$submitter === `${name}=${value}` : st.data?.get(name) === value));
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={mine || undefined} name={name} value={value} formNoValidate={formNoValidate}>
      {mine ? <span className="spinner" aria-hidden="true" /> : icon ? <span aria-hidden="true" className="ms">{icon}</span> : null}
      {mine && pendingText ? pendingText : children}
    </button>
  );
}

export function FormError() {
  const s = useFormState();
  if (!s.error) return null;
  return (
    <div className="form-banner" role="alert">
      <span aria-hidden="true" className="ms">error</span>
      <div>{s.error}</div>
    </div>
  );
}
