"use client";

import { ActionForm, Submit } from "@/components/form";
import type { ActionState } from "@/lib/action";

export function UserPerms({ action, v }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; v: { canBuy: boolean; canSell: boolean; isAdvisor: boolean; isAdmin: boolean } }) {
  return (
    <ActionForm action={action} className="hstack gap-12" noBanner>
      <div className="wrap-gap" style={{ gap: 12 }}>
        {([["canBuy", "Compra"], ["canSell", "Venta"], ["isAdvisor", "Asesor"], ["isAdmin", "Admin"]] as const).map(([k, l]) => (
          <label key={k} className="check" style={{ fontSize: 14 }}>
            <input type="checkbox" name={k} defaultChecked={v[k]} />
            {l}
          </label>
        ))}
      </div>
      <Submit className="btn btn-secondary btn-sm" pendingText="…">Guardar</Submit>
    </ActionForm>
  );
}
