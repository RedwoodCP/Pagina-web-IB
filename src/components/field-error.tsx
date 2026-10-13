"use client";

import { useFormState } from "./form";

export function FieldErrorFor({ name }: { name: string }) {
  const s = useFormState();
  const m = s.fields?.[name];
  if (!m) return null;
  return (
    <div className="field-error mt-8" role="alert">
      <span className="ms">error</span>
      {m}
    </div>
  );
}
