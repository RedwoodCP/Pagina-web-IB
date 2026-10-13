/* Preparación local en un solo paso (Windows, Mac o Linux):
   crea .env si no existe, reinicia la base local de desarrollo y carga datos de demostración. */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  const env = readFileSync(".env", "utf8").replace(/^APP_SECRET=.*$/m, `APP_SECRET="${randomBytes(32).toString("hex")}"`);
  writeFileSync(".env", env);
  console.log("Se creó .env con un secreto aleatorio.");
}
rmSync("prisma/dev.db", { force: true });
rmSync("prisma/dev.db-journal", { force: true });
rmSync("storage", { recursive: true, force: true });
execSync("npx prisma db push", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
console.log("\nListo. Ejecute: npm run dev  y abra http://localhost:3000");
