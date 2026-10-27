/* Elimina TODOS los datos de demostración (isDemo=true) y sus archivos.
   Uso: npm run demo:purge -- --confirmar   (también disponible en Admin › Integraciones) */
import { PrismaClient } from "@prisma/client";
import { purgeDemoData } from "../src/lib/demo";

if (!process.argv.includes("--confirmar")) {
  console.log("Esto elimina usuarios, organizaciones, oportunidades, documentos e invitaciones de demostración.");
  console.log("Para continuar ejecute: npm run demo:purge -- --confirmar");
  process.exit(0);
}
const db = new PrismaClient();
purgeDemoData(db)
  .then((r) => console.log(`Eliminados: ${r.users} usuarios, ${r.listings} oportunidades, ${r.files} archivos de demostración.`))
  .finally(() => db.$disconnect());
