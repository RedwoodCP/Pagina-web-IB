/* Compilación en Vercel (o cualquier servidor con PostgreSQL/Supabase):
   1. genera el esquema PostgreSQL, 2. aplica el esquema a la base, 3. si SEED_DEMO=true y la base
   está vacía, carga los datos de demostración, 4. compila Next.js. */
import { execSync } from "node:child_process";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });
for (const k of ["DATABASE_URL", "DIRECT_URL", "APP_SECRET"]) {
  if (!process.env[k]) throw new Error(`Falta la variable de entorno ${k}. Revise la guía de publicación en README.md.`);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY: en Vercel los archivos deben guardarse en Supabase Storage.");

run("tsx scripts/prisma-postgres.ts");
run("prisma generate --schema prisma/postgres.prisma");
// db push aplica cambios no destructivos; si un cambio borraría datos, falla y no se publica.
run("prisma db push --schema prisma/postgres.prisma --skip-generate");
run("tsx scripts/migrate-sectors.ts");
if (process.env.SEED_DEMO === "true") run("tsx scripts/seed-if-empty.ts");
run("next build");
