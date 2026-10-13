/* Carga los datos de demostración solo si la base no tiene usuarios. */
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const db = new PrismaClient();
db.user
  .count()
  .then((n) => {
    if (n > 0) return console.log(`La base ya tiene ${n} usuarios: no se cargan datos de demostración.`);
    execSync("tsx prisma/seed.ts", { stdio: "inherit" });
  })
  .finally(() => db.$disconnect());
