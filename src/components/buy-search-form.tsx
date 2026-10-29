import Link from "next/link";
import type { BuySearch } from "@prisma/client";
import { CURRENCIES, EMPLOYEE_RANGES, REGIONS, SECTORS } from "@/lib/domain";
import { INTL_OPS, criteria } from "@/lib/buy-search";
import type { ActionState } from "@/lib/action";
import { ActionForm, ChipGroup, Field, Select, Submit, TextArea } from "@/components/form";
import { FieldErrorFor } from "@/components/field-error";

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

/**
 * Formulario de criterios de una búsqueda de compra (alta y edición).
 * buyer: lo usa el propio comprador (sin campo de cliente; vuelve a sus búsquedas).
 */
export function BuySearchForm({ action, b, buyer }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; b?: BuySearch; buyer?: boolean }) {
  const c = b ? criteria(b) : { regions: [], sectors: [], employees: [] };
  return (
    <ActionForm action={action}>
      <div className="grid-2">
        {!buyer && <Field name="clientName" icon="lock" label="Cliente o comprador" required maxLength={160} defaultValue={b?.clientName ?? ""} hint="Para quién es la búsqueda. Solo lo ve administración." />}
        <Select name="currency" label="Moneda de las cifras" required options={[...CURRENCIES]} defaultValue={b?.currency ?? "USD"} hint="Solo se cruzan oportunidades publicadas en esta moneda." />
      </div>

      <div className="label-caps mt-32 mb-16">Criterios obligatorios</div>
      <div className="grid-2">
        <div>
          <div className="field-label mb-8">Ventas anuales (millones) *</div>
          <div className="grid-2">
            <Field name="salesMin" label="Mínimo" inputMode="decimal" defaultValue={s(b?.salesMin)} />
            <Field name="salesMax" label="Máximo" inputMode="decimal" defaultValue={s(b?.salesMax)} />
          </div>
          <FieldErrorFor name="sales" />
        </div>
        <div>
          <div className="field-label mb-8">Margen EBITDA (%) *</div>
          <div className="grid-2">
            <Field name="marginMin" label="Mínimo" inputMode="decimal" defaultValue={s(b?.marginMin)} />
            <Field name="marginMax" label="Máximo" inputMode="decimal" defaultValue={s(b?.marginMax)} />
          </div>
          <FieldErrorFor name="margin" />
        </div>
      </div>
      <div className="mt-24">
        <ChipGroup name="regions" label="Región o ubicación" required multiple options={[...REGIONS]} defaultValue={c.regions} />
      </div>
      <div className="mt-24">
        <ChipGroup name="sectors" label="Industria" required multiple options={[...SECTORS]} defaultValue={c.sectors} />
      </div>

      <div className="label-caps mt-32 mb-8">Criterios opcionales</div>
      {buyer && <p className="small c-lead mb-16">Deuda, operación en otros países y concentración de clientes son datos confidenciales de cada empresa: nuestro equipo los revisa por usted y le contacta si encajan.</p>}
      <div className="grid-3">
        <Field name="debtEbitdaMax" label="Deuda / EBITDA máxima (veces)" optional inputMode="decimal" defaultValue={s(b?.debtEbitdaMax)} placeholder="Ej.: 2.5" />
        <Select name="intlOps" label="Operación en otros países" options={Object.entries(INTL_OPS)} defaultValue={b?.intlOps ?? "indistinto"} />
        <Field name="topClientMax" label="Concentración máxima en el cliente principal (%)" optional inputMode="decimal" defaultValue={s(b?.topClientMax)} placeholder="Ej.: 30" />
      </div>
      <div className="mt-24">
        <ChipGroup name="employees" label="Número de empleados" multiple options={[...EMPLOYEE_RANGES]} defaultValue={c.employees} hint="Opcional. Deje sin marcar para no filtrar." />
      </div>
      <div className="mt-24">
        <TextArea name="notes" label={buyer ? "Comentarios para nuestro equipo" : "Notas internas"} optional rows={3} maxLength={2000} defaultValue={b?.notes ?? ""} />
      </div>

      <div className="form-actions">
        <Link prefetch={false} href={buyer ? "/busquedas" : "/admin/busquedas"} className="btn btn-secondary btn-lg">{b ? "Volver" : "Cancelar"}</Link>
        <Submit className="btn btn-lg" icon="save" pendingText="Guardando…">{b ? "Guardar criterios" : "Registrar búsqueda"}</Submit>
      </div>
    </ActionForm>
  );
}
