import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { readStored } from "./files";
import { fmtDate } from "./format";
import { NDA_VERSION } from "./domain";
import { ndaHash, ndaText } from "./nda";

/**
 * NDA que aplica a una oportunidad: el PDF que cargó el vendedor o, si no hay (datos antiguos
 * o de demostración), el texto de ejemplo de la plataforma. La huella (sha256) identifica el
 * documento exacto que el comprador aceptó.
 */
export async function ndaSource(listingId: string, code: string) {
  const doc = await db.listingDocument.findFirst({ where: { listingId, kind: "nda" }, orderBy: { createdAt: "desc" } });
  if (!doc) return { kind: "plataforma" as const, doc: null, version: NDA_VERSION, text: ndaText(code), hash: () => Promise.resolve(ndaHash(code)) };
  return {
    kind: "vendedor" as const,
    doc,
    version: `NDA de la empresa · ${fmtDate(doc.createdAt)} · ${doc.id.slice(-8)}`,
    text: `NDA de la empresa para ${code} (documento PDF del vendedor)`,
    hash: async () => createHash("sha256").update(await readStored(doc.storageKey)).digest("hex"),
  };
}
