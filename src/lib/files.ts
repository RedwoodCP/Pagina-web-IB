import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { env } from "./env";
import { hmac, randomToken, safeEqual } from "./crypto";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const LINK_TTL_SECONDS = 300;

const TYPES: Record<string, { mime: string; magic: (b: Buffer) => boolean }> = {
  pdf: { mime: "application/pdf", magic: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  jpg: { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: "image/png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  // xlsx y docx son contenedores ZIP
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
};

export const ACCEPTED_LABEL = "PDF, XLSX, DOCX, JPG o PNG (máx. 25 MB)";
export const ACCEPT_ATTR = ".pdf,.xlsx,.docx,.jpg,.jpeg,.png";

/** Valida extensión, tamaño y firma binaria. Devuelve el MIME o un mensaje de error. */
export function validateUpload(name: string, buf: Buffer, onlyPdf = false): { mime: string } | { error: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const t = TYPES[ext];
  if (onlyPdf && ext !== "pdf") return { error: "El teaser debe ser un PDF." };
  if (!t) return { error: `Formato no admitido. Use ${ACCEPTED_LABEL}.` };
  if (buf.length === 0) return { error: "El archivo está vacío." };
  if (buf.length > MAX_FILE_BYTES) return { error: "El archivo supera 25 MB." };
  if (!t.magic(buf)) return { error: "El contenido del archivo no corresponde a su extensión." };
  return { mime: t.mime };
}

function dir() {
  return path.resolve(process.cwd(), env.storageDir);
}

export async function storeFile(buf: Buffer): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const key = randomToken(24);
  await writeFile(path.join(dir(), key), buf, { mode: 0o600 });
  return key;
}

export async function readStored(key: string): Promise<Buffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error("clave inválida");
  return readFile(path.join(dir(), key));
}

export async function deleteStored(key: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return;
  await unlink(path.join(dir(), key)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Enlaces temporales firmados. No existen URLs públicas permanentes: cada enlace
// vale 5 minutos, está atado al usuario y el permiso se vuelve a comprobar al servir.

type LinkPayload = { d: string; u: string; m: "ver" | "descargar"; e: number };

export function signFileLink(docId: string, userId: string, mode: "ver" | "descargar"): string {
  const p: LinkPayload = { d: docId, u: userId, m: mode, e: Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `/api/archivos/${body}.${hmac(body)}`;
}

export function verifyFileLink(token: string): LinkPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(hmac(body), sig)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as LinkPayload;
    if (p.e < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Prepara un PDF para servirlo: elimina metadatos (autor, título, software) que
 * podrían revelar la identidad y, opcionalmente, estampa una marca de agua con
 * el correo del usuario y la fecha.
 */
export async function preparePdf(buf: Buffer, watermark?: string): Promise<Buffer> {
  try {
    const pdf = await PDFDocument.load(buf, { updateMetadata: false });
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setCreator("");
    pdf.setProducer("");
    if (watermark) {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      for (const page of pdf.getPages()) {
        const { width, height } = page.getSize();
        page.drawText(watermark, {
          x: width * 0.12,
          y: height * 0.3,
          size: Math.max(10, Math.min(width, height) / 32),
          font,
          color: rgb(0.45, 0.45, 0.45),
          opacity: 0.22,
          rotate: degrees(35),
        });
        page.drawText(watermark, { x: 24, y: 14, size: 7, font, color: rgb(0.4, 0.4, 0.4), opacity: 0.7 });
      }
    }
    return Buffer.from(await pdf.save());
  } catch {
    // PDF cifrado o dañado: se sirve tal cual solo si no requiere marca de agua.
    if (watermark) throw new Error("No fue posible preparar el documento protegido.");
    return buf;
  }
}
