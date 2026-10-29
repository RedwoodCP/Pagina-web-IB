import type { BuySearch } from "@prisma/client";
import { ORG_TYPES } from "@/lib/domain";
import { MAX_FILE_MB } from "@/lib/files";
import { fmtSize } from "@/lib/format";
import { PUBLICATION_BADGE } from "@/lib/buy-search";
import { removeBuyerTeaserAction, savePublicationAction, withdrawPublicationAction } from "@/app/actions/buy-demand";
import { ActionForm, Field, Select, Submit, TextArea } from "@/components/form";
import { FieldErrorFor } from "@/components/field-error";
import { ActionButton } from "@/components/confirm";
import { Badge, Banner, Icon } from "@/components/ui";

/**
 * Perfil anónimo de una búsqueda para vendedores y asesores («busco una empresa así»).
 * admin: lo publica administración directamente; si no, lo envía el comprador a revisión.
 */
export function BuyPublication({ b, admin, defaultType }: { b: BuySearch; admin?: boolean; defaultType?: string | null }) {
  const live = b.publication === "publicada" || b.publication === "revision";
  return (
    <div className="card card-pad">
      <div className="hstack between wrap-gap mb-8">
        <h2 className="h3"><Icon name="campaign" /> Mostrar a vendedores</h2>
        <div className="wrap-gap">
          <Badge b={PUBLICATION_BADGE[b.publication]!} />
          {live && (
            <ActionButton action={withdrawPublicationAction.bind(null, b.id)} icon="visibility_off" confirm={{ title: "Dejar de mostrar", body: "Los vendedores dejarán de ver esta búsqueda. Las propuestas recibidas se conservan." }} confirmLabel="Dejar de mostrar">
              Dejar de mostrar
            </ActionButton>
          )}
        </div>
      </div>
      <p className="c-lead mb-16">
        Publique un perfil anónimo de lo que busca. Vendedores y asesores de la red lo verán, sin su nombre ni su organización, y podrán proponerle una empresa.
        {admin ? " Desde administración se publica de inmediato." : " Nuestro equipo lo revisa antes de mostrarlo."}
      </p>
      {b.publication === "rechazada" && b.reviewNote && <div className="mb-16"><Banner tone="warn" icon="edit_note"><strong>Cambios solicitados por el equipo:</strong> {b.reviewNote}</Banner></div>}
      {b.publication === "revision" && !admin && <div className="mb-16"><Banner tone="info" icon="hourglass_top">En revisión por nuestro equipo. Le avisaremos cuando sea visible para los vendedores.</Banner></div>}
      <ActionForm action={savePublicationAction.bind(null, b.id)}>
        <div className="grid-2">
          <Field name="title" label="Título anónimo" required maxLength={140} defaultValue={b.title ?? ""} placeholder="Ej.: Family office busca empresa industrial en el Bajío" />
          <Select name="buyerType" label="Tipo de comprador (visible)" required placeholder="Seleccione…" options={Object.entries(ORG_TYPES)} defaultValue={b.buyerType ?? defaultType ?? ""} />
        </div>
        <div className="mt-16">
          <TextArea name="summary" label="Qué busca" required rows={4} maxLength={1500} defaultValue={b.summary ?? ""} hint="Tipo de empresa, tamaño, tesis de inversión, horizonte. No incluya el nombre de su organización." />
        </div>
        <div className="mt-16 field">
          <span className="field-label">Perfil del comprador (PDF, opcional)</span>
          {b.teaserKey ? (
            <div className="card row mt-8">
              <Icon name="description" />
              <div className="row-main"><div className="fw6">{b.teaserName}</div><div className="small c-lead">{fmtSize(b.teaserSize ?? 0)} · se mostrará como «Perfil del comprador {b.code}.pdf», sin metadatos</div></div>
              <a className="btn btn-secondary btn-sm" href={`/api/busquedas/${b.id}/perfil`} target="_blank" rel="noopener"><Icon name="visibility" />Ver</a>
              <ActionButton action={removeBuyerTeaserAction.bind(null, b.id)} className="btn btn-icon" icon="delete" danger confirm={{ title: "Quitar archivo", body: "El PDF se eliminará." }} confirmLabel="Quitar">
                <span className="sr-only">Quitar perfil del comprador</span>
              </ActionButton>
            </div>
          ) : null}
          <input type="file" name="teaser" accept=".pdf" className="input mt-8" aria-label="Perfil del comprador (PDF)" style={{ paddingTop: 10 }} />
          <span className="field-hint">{b.teaserKey ? "Elija otro archivo para reemplazarlo. " : ""}PDF de hasta {MAX_FILE_MB} MB, sin logotipos ni nombres que lo identifiquen.</span>
          <FieldErrorFor name="teaser" />
        </div>
        <div className="form-actions">
          <span />
          <Submit className="btn btn-lg" icon="campaign" pendingText="Guardando…">
            {admin ? (b.publication === "publicada" ? "Guardar cambios" : "Publicar para vendedores") : b.publication === "publicada" ? "Guardar y enviar a revisión" : "Enviar a revisión"}
          </Submit>
        </div>
      </ActionForm>
    </div>
  );
}
