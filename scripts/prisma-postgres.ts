/* Genera prisma/postgres.prisma a partir de prisma/schema.prisma (fuente única del modelo),
   cambiando el proveedor a PostgreSQL (Supabase). Uso interno de vercel-build. */
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("prisma/schema.prisma", "utf8");
const out = src.replace(
  /datasource db \{[\s\S]*?\}/,
  `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`,
);
if (out === src) throw new Error("No se encontró el bloque datasource.");
writeFileSync("prisma/postgres.prisma", "// ARCHIVO GENERADO por scripts/prisma-postgres.ts. No editar: edite prisma/schema.prisma.\n" + out);
console.log("prisma/postgres.prisma generado (PostgreSQL).");
