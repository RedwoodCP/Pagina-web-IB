/* Elimina TODOS los datos marcados como demostración (isDemo=true) y sus archivos.
   Uso: npm run demo:purge -- --confirmar */
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";

if (!process.argv.includes("--confirmar")) {
  console.log("Esto elimina usuarios, organizaciones, oportunidades, documentos e invitaciones de demostración.");
  console.log("Para continuar ejecute: npm run demo:purge -- --confirmar");
  process.exit(0);
}
const db = new PrismaClient();
const STORAGE = path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");

async function main() {
  const docs = await db.listingDocument.findMany({ where: { listing: { isDemo: true } }, select: { storageKey: true } });
  const demoUsers = await db.user.findMany({ where: { isDemo: true }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id);
  await db.listing.deleteMany({ where: { OR: [{ isDemo: true }, { ownerId: { in: ids } }] } });
  await db.engagement.deleteMany({ where: { OR: [{ isDemo: true }, { userId: { in: ids } }] } });
  await db.invitation.deleteMany({ where: { OR: [{ isDemo: true }, { invitedById: { in: ids } }] } });
  await db.membershipRequest.deleteMany({ where: { isDemo: true } });
  await db.auditLog.updateMany({ where: { actorId: { in: ids } }, data: { actorId: null } });
  await db.user.deleteMany({ where: { isDemo: true } });
  await db.organization.deleteMany({ where: { isDemo: true, users: { none: {} } } });
  for (const d of docs) await unlink(path.join(STORAGE, d.storageKey)).catch(() => {});
  console.log(`Datos de demostración eliminados (${docs.length} archivos). Cree su primer administrador con: npm run admin:create`);
}
main().finally(() => db.$disconnect());
