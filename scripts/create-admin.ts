/* Crea un administrador real. Uso: npm run admin:create -- correo@dominio.com "Nombre Apellido"
   La contraseña temporal se imprime una sola vez; cámbiela al entrar (Mi perfil). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.log('Uso: npm run admin:create -- correo@dominio.com "Nombre Apellido"');
  process.exit(1);
}
const db = new PrismaClient();
const pass = randomBytes(9).toString("base64url") + "7a";
db.user
  .create({ data: { email: email.toLowerCase(), name, passwordHash: bcrypt.hashSync(pass, 12), isAdmin: true, canBuy: false, onboardingDone: true } })
  .then(() => console.log(`Administrador creado: ${email}\nContraseña temporal: ${pass}`))
  .catch((e) => console.error("No se pudo crear:", e.message))
  .finally(() => db.$disconnect());
