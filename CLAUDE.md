# Notas para Claude

Plataforma privada de compraventa de empresas (Next.js 15 + Prisma/SQLite). Detalles en README.md.

## Primera ejecución en una computadora nueva
1. Verificar que Node.js 20+ esté instalado (`node -v`).
2. `npm install`
3. `npm run setup` — crea `.env` con secreto aleatorio, la base `prisma/dev.db` y los datos de demostración (borra la base local anterior).
4. `npm run dev` y abrir http://localhost:3000 (configurado en `.claude/launch.json`).

Cuentas demo (contraseña `Demo2026segura`): admin@demo.redwood.test, mariana.robles@demo.redwood.test, javier.ortega@demo.redwood.test.

## Reglas del proyecto
- Los permisos se aplican en el servidor (`src/lib/access.ts`); nunca solo ocultando elementos.
- Firmar el NDA no concede acceso: el acceso lo decide el vendedor, su asesor o (excepcionalmente) administración.
- No presentar la aceptación del NDA como firma electrónica: no hay proveedor configurado.
- Pruebas: `npx playwright test` (usan `prisma/test.db`; detenga antes cualquier `npm run dev`, comparten `.next`).
