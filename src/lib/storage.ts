// Almacenamiento de archivos privados. Sin dependencias de Next para poder usarlo también
// desde scripts (seed). Dos modos:
//  - Supabase Storage (si hay SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY): bucket PRIVADO.
//    La llave de servicio solo vive en el servidor; el navegador nunca recibe URLs de Supabase.
//  - Disco local en STORAGE_DIR (desarrollo o servidor con volumen persistente).
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const BUCKET = process.env.SUPABASE_BUCKET || "documentos-privados";
const supa = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};

export function storageMode(): "supabase" | "local" {
  return supa() ? "supabase" : "local";
}

const localDir = () => path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");
const validKey = (k: string) => /^[A-Za-z0-9_-]+$/.test(k);

// Llaves nuevas (sb_secret_…) van solo en el encabezado apikey; las llaves JWT antiguas
// (service_role) también en Authorization: Bearer.
function authHeaders(key: string): Record<string, string> {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

let bucketReady = false;
async function ensureBucket(s: { url: string; key: string }) {
  if (bucketReady) return;
  const h = authHeaders(s.key);
  const r = await fetch(`${s.url}/storage/v1/bucket/${BUCKET}`, { headers: h });
  if (r.ok) {
    const b = (await r.json()) as { public?: boolean };
    if (b.public) throw new Error(`El bucket «${BUCKET}» es público. Debe ser privado.`);
  } else {
    const c = await fetch(`${s.url}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
    if (!c.ok && c.status !== 409) throw new Error(`No se pudo crear el bucket: ${c.status} ${await c.text()}`);
  }
  bucketReady = true;
}

/** Guarda el archivo con un nombre aleatorio y devuelve la clave. */
export async function putObject(buf: Buffer): Promise<string> {
  const key = randomBytes(24).toString("base64url");
  const s = supa();
  if (s) {
    await ensureBucket(s);
    const r = await fetch(`${s.url}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: { ...authHeaders(s.key), "Content-Type": "application/octet-stream", "x-upsert": "false" },
      body: new Uint8Array(buf),
    });
    if (!r.ok) throw new Error(`Error al guardar el archivo: ${r.status} ${await r.text()}`);
    return key;
  }
  await mkdir(localDir(), { recursive: true });
  await writeFile(path.join(localDir(), key), buf, { mode: 0o600 });
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  if (!validKey(key)) throw new Error("clave inválida");
  const s = supa();
  if (s) {
    const r = await fetch(`${s.url}/storage/v1/object/authenticated/${BUCKET}/${key}`, {
      headers: authHeaders(s.key),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Archivo no disponible: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  return readFile(path.join(localDir(), key));
}

export async function removeObject(key: string) {
  if (!validKey(key)) return;
  const s = supa();
  if (s) {
    await fetch(`${s.url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...authHeaders(s.key), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
    }).catch(() => {});
    return;
  }
  await unlink(path.join(localDir(), key)).catch(() => {});
}
