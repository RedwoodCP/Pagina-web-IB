// Eliminación de datos de demostración (isDemo=true). Sin dependencias de Next: la usan
// la administración (botón) y el script scripts/purge-demo.ts.
import type { PrismaClient } from "@prisma/client";
import { removeObject } from "./storage";

export async function purgeDemoData(db: PrismaClient) {
  const demoUsers = await db.user.findMany({ where: { isDemo: true }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id);
  const docs = await db.listingDocument.findMany({ where: { listing: { OR: [{ isDemo: true }, { ownerId: { in: ids } }] } }, select: { storageKey: true } });
  const listings = await db.listing.deleteMany({ where: { OR: [{ isDemo: true }, { ownerId: { in: ids } }] } });
  await db.engagement.deleteMany({ where: { OR: [{ isDemo: true }, { userId: { in: ids } }] } });
  await db.invitation.deleteMany({ where: { isDemo: true } });
  // Invitaciones reales enviadas desde la cuenta demo siguen siendo válidas.
  await db.invitation.updateMany({ where: { invitedById: { in: ids } }, data: { invitedById: null } });
  await db.membershipRequest.deleteMany({ where: { isDemo: true } });
  await db.question.deleteMany({ where: { OR: [{ askerId: { in: ids } }, { answeredById: { in: ids } }] } });
  await db.auditLog.updateMany({ where: { actorId: { in: ids } }, data: { actorId: null } });
  const users = await db.user.deleteMany({ where: { isDemo: true } });
  await db.organization.deleteMany({ where: { isDemo: true, users: { none: {} }, listings: { none: {} } } });
  for (const d of docs) await removeObject(d.storageKey);
  return { users: users.count, listings: listings.count, files: docs.length };
}

export async function hasDemoData(db: PrismaClient) {
  return (await db.user.count({ where: { isDemo: true } })) + (await db.listing.count({ where: { isDemo: true } })) > 0;
}
