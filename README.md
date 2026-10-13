# Red privada de transacciones · Redwood Capital Partners

Plataforma web privada de compraventa de empresas: catálogo anónimo, NDA por oportunidad,
autorización de acceso separada del NDA, espacio privado de operación, panel del vendedor y
administración. Construida a partir del diseño aprobado (`design/`).

> **Datos de demostración.** Todo lo que crea `npm run db:seed` es ficticio y está marcado como
> «Demo» en la interfaz (`isDemo` en la base de datos). Elimínelo antes de operar con datos reales.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env          # y genere APP_SECRET: openssl rand -hex 32
npm run db:reset              # crea prisma/dev.db y carga datos de demostración
npm run dev                   # http://localhost:3000
```

`db:reset` borra la base local `prisma/dev.db` y la carpeta `storage/`. Úselo solo en desarrollo.

Cuentas de demostración (contraseña `Demo2026segura`):

| Perfil | Correo |
|---|---|
| Administración | admin@demo.redwood.test |
| Compra y venta | mariana.robles@demo.redwood.test |
| Asesor representante | javier.ortega@demo.redwood.test |
| Solo vendedor | vendedor@demo.redwood.test |
| Comprador | pablo@demo.redwood.test |

Invitaciones de prueba: `/invitacion/demo-invitacion-vigente`, `/invitacion/demo-invitacion-vencida`, `/invitacion/demo-invitacion-revocada`.

## Pruebas

```bash
npx playwright test           # 15 pruebas E2E; usan su propia base (prisma/test.db) y storage-test/
npm run typecheck
```

Cubren: solicitud de acceso con validaciones y folio; invitaciones vigentes, vencidas, revocadas,
inválidas y ya usadas; perfil en 4 pasos; rutas privadas sin sesión y sin rol; filtros (sector,
margen EBITDA, EBITDA monetario, moneda), favoritos; que nombre, ciudad y métricas confidenciales
no viajen en la respuesta HTML; NDA con validaciones y «aceptación registrada»; que firmar no abre
el espacio privado; enlaces de archivo robados o sin permiso; organización excluida; autorizar y
revocar acceso; asistente del vendedor completo (anonimato, archivos inválidos, envío) y aprobación;
aprobación de solicitudes, invitaciones duplicadas y revocadas, bitácora; preguntas, reuniones,
interés y documentos restringidos; uso en celular de 390 px sin desplazamiento horizontal.

## Arquitectura

- **Next.js 15 (App Router) + TypeScript.** Páginas de servidor y Server Actions; sin API pública salvo archivos.
- **Prisma.** SQLite en desarrollo; PostgreSQL en producción (ver «Publicar»). Esquema en `prisma/schema.prisma`.
- **Sesiones propias.** Cookie httpOnly con token aleatorio; en base solo se guarda su hash. Contraseñas con bcrypt (12), bloqueo temporal tras 5 intentos fallidos.
- **Permisos en el servidor** (`src/lib/access.ts`):
  - por usuario (compra, venta, asesor, administración),
  - por organización (exclusión de organizaciones por oportunidad),
  - por oportunidad (dueño, colaborador «gestor» o «lector», comprador autorizado).
  Los datos confidenciales se omiten del objeto que llega a la página (`toPublicListing`); no basta con ocultarlos.
- **Archivos privados** (`src/lib/files.ts`): en `STORAGE_DIR`, fuera de `/public`, con nombre aleatorio. Se validan extensión, tamaño (25 MB) y firma binaria. Se entregan por `/api/documentos/:id/abrir` → enlace firmado de 5 minutos atado al usuario, que vuelve a comprobar el permiso (una revocación invalida enlaces ya emitidos). Los PDF se sirven sin metadatos y, los confidenciales, con marca de agua (correo, organización y fecha). El teaser nunca expone el nombre original del archivo.
- **Bitácora** (`AuditLog`): accesos, denegaciones, decisiones, descargas, cambios de permisos, etc. Visible en Admin › Bitácora.
- **Estados** (`src/lib/domain.ts`): NDA (`pendiente_firma → firmado`) y acceso (`none → pendiente → autorizado | rechazado`, `autorizado → revocado`, restaurables) son independientes. Firmar solo deja el acceso en «pendiente».

Estructura principal:

```
src/app/page.tsx                    página pública
src/app/(access)/…                  solicitud, estado, login, invitación, recuperación, perfil (4 pasos)
src/app/(app)/panel                 panel del comprador
src/app/(app)/oportunidades/…       catálogo, detalle, NDA, espacio privado
src/app/(app)/venta/…               mis publicaciones, asistente de 6 pasos, gestión de interesados
src/app/(app)/admin/…               solicitudes, invitaciones, publicaciones, accesos, usuarios, bitácora, correos, integraciones
src/app/actions/                    Server Actions (toda mutación valida sesión, rol y permiso)
src/app/api/                        entrega protegida de archivos
design/                             prototipo, guía y recursos de marca de referencia
```

## Qué funciona realmente y qué falta

| Función | Estado |
|---|---|
| Autenticación, sesiones, roles, invitaciones de un solo uso con vencimiento a 14 días | Funciona |
| Catálogo, filtros, favoritos, detalle anónimo, visibilidad por métrica, moneda (USD/MXN) | Funciona |
| NDA y autorización separadas, espacio privado, preguntas, reuniones, interés, documentos por permiso | Funciona |
| Asistente del vendedor, borradores, carga real de archivos, revisión y aprobación | Funciona |
| Bitácora, gestión de usuarios y permisos, exclusiones, colaboradores | Funciona |
| **Firma electrónica del NDA** | **Requiere proveedor.** Hoy se registra una «aceptación» (nombre, cargo, fecha, IP, navegador, versión y huella del texto) y la interfaz dice expresamente que no es una firma electrónica avanzada. Adaptador preparado en `src/lib/signature.ts` (`SIGNATURE_PROVIDER`). |
| **Texto del NDA, aviso de privacidad y términos** | **Pendientes del área jurídica.** El NDA es el texto de ejemplo del prototipo, rotulado como tal. |
| **Correo transaccional** | **Requiere proveedor.** Sin él, los correos quedan en Admin › Correos y el enlace de invitación se muestra al administrador. Punto de integración: `src/lib/notify.ts`. |
| Antivirus de archivos, verificación en dos pasos, calendario y videollamada | No incluidos; señalados en Admin › Integraciones. |
| Almacenamiento cifrado en la nube | Hoy, disco local. Para producción, sustituya `storeFile/readStored` por S3, GCS o un servicio equivalente con cifrado en reposo. |
| Visor protegido | Los PDF y las imágenes se abren en el visor del navegador con marca de agua. Un visor que impida capturas no es posible en la web; XLSX y DOCX en modo lectura requieren conversión a PDF (pendiente). |

No se muestran certificaciones ni distintivos de verificación.

## Publicar

1. **Base de datos.** En `prisma/schema.prisma` cambie `provider = "sqlite"` por `"postgresql"` y defina `DATABASE_URL`. Ejecute `npx prisma migrate dev --name init` una vez en local y `npx prisma migrate deploy` en el servidor.
2. **Variables.** Revise `.env.example`. Como mínimo: `APP_SECRET` (64 caracteres aleatorios), `APP_URL` con https, `SHOW_DEMO_DATA=false` y `STORAGE_DIR` en un volumen persistente con respaldo.
3. **Datos.** No ejecute el seed en producción. Si lo usó, ejecute `npm run demo:purge -- --confirmar`. Cree el primer administrador con `npm run admin:create -- correo@redwood… "Nombre"`.
4. **Compilar y arrancar.** `npm run build && npm start` (puerto 3000) detrás de un proxy con HTTPS. Configure `TZ=America/Mexico_City` para que los horarios de reunión coincidan.
5. **Hosting.** Necesita un servidor Node con disco persistente (VM, contenedor, Render, Railway, Fly.io…). Vercel sirve para la aplicación, pero entonces los archivos deben ir a almacenamiento externo (paso de la tabla anterior).
6. **Antes de abrir a usuarios reales.** Conecte correo y firma, reemplace los textos legales, configure respaldos de la base y del almacenamiento y revise la bitácora.

## Pendiente de decisión

- **Nombre de la plataforma.** El prototipo usa «[Nombre de la plataforma]». Mientras no se defina, se muestra el logotipo de Redwood Capital Partners. Se cambia con `PLATFORM_NAME` en `.env`.
- **Logotipo.** Se recortó del manual de marca (variantes 1 y RW) sin redibujarlo. Para máxima nitidez, reemplace `public/brand/redwood-logo*.png` por los archivos originales en alta resolución o SVG.
