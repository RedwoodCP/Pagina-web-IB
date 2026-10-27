/* Convierte los sectores de la lista anterior a la lista vigente (idempotente).
   Se ejecuta en cada compilación de producción. */
import { PrismaClient } from "@prisma/client";
import { LEGACY_SECTORS } from "../src/lib/domain";

const db = new PrismaClient();
(async () => {
  let n = 0;
  for (const [oldName, newName] of Object.entries(LEGACY_SECTORS)) {
    n += (await db.listing.updateMany({ where: { sector: oldName }, data: { sector: newName } })).count;
  }
  const users = await db.user.findMany({ select: { id: true, prefSectors: true } });
  for (const u of users) {
    const list: string[] = JSON.parse(u.prefSectors || "[]");
    const next = Array.from(new Set(list.map((s) => LEGACY_SECTORS[s] ?? s)));
    if (JSON.stringify(next) !== JSON.stringify(list)) await db.user.update({ where: { id: u.id }, data: { prefSectors: JSON.stringify(next) } });
  }
  console.log(`Sectores actualizados: ${n} oportunidades.`);
})().finally(() => db.$disconnect());
