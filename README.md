# Confidant · Red privada de transacciones de Redwood Capital Partners

Plataforma web privada de compraventa de empresas: catálogo anónimo, NDA por oportunidad,
autorización de acceso separada del NDA, espacio privado de operación, panel del vendedor y
administración. Construida a partir del diseño aprobado (`design/`).

> **Datos de demostración.** Todo lo que crea `npm run db:seed` es ficticio y está marcado como
> «Demo» en la interfaz (`isDemo` en la base de datos). Elimínelo antes de operar con datos reales.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run setup                 # crea .env, la base local y los datos de demostración
npm run dev                   # http://localhost:3000
```

`npm run setup` (o `db:reset`) borra la base local `prisma/dev.db` y la carpeta `storage/` y las vuelve a crear. Úselo solo en desarrollo.

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
npx playwright test           # 26 pruebas E2E; usan su propia base (prisma/test.db) y storage-test/
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
| Búsquedas de compra: el comprador las registra en Compra › Mis búsquedas (privadas: solo él y administración) y recibe aviso cuando se publica una oportunidad que coincide con lo que puede ver (nunca se comparan cifras confidenciales). Administración (Admin › Búsquedas de compra) también las registra para clientes: criterios obligatorios (ventas, margen EBITDA, región, industria) y opcionales (deuda/EBITDA, empleados, operación en otros países, concentración en el cliente principal), cruzadas con las oportunidades publicadas. Al aprobar una oportunidad que coincide, administración recibe notificación y correo. Uso interno. | Funciona |
| Perfil del comprador para vendedores: el comprador publica un perfil anónimo de su búsqueda (título, descripción, tipo de comprador y PDF opcional) que administración revisa; vendedores y asesores lo ven en Venta › Compradores buscando y proponen una oportunidad publicada o una empresa aún no publicada. El comprador no ve quién propone; administración sí. | Funciona |
| Vista de trabajo: un administrador que también compra o vende alterna entre «Administración» y «Compra y venta» (barra lateral o Mi perfil). En compra y venta actúa como cualquier miembro, sin permisos de administración. | Funciona |
| **Firma electrónica del NDA** | **Requiere proveedor.** Hoy se registra una «aceptación» (nombre, cargo, fecha, IP, navegador, versión y huella del texto) y la interfaz dice expresamente que no es una firma electrónica avanzada. Adaptador preparado en `src/lib/signature.ts` (`SIGNATURE_PROVIDER`). |
| **NDA** | Cada vendedor carga el PDF del NDA de su empresa (obligatorio para enviar a revisión). El comprador lo lee y descarga en la plataforma; al aceptarlo se guarda la huella sha256 de ese archivo. Las oportunidades sin NDA propio usan el texto de ejemplo. |
| **Aviso de privacidad** | Aviso de la plataforma (datos que trata, proveedores Supabase/Vercel/Resend, cookies técnicas, derechos ARCO) en `src/components/platform-privacy.tsx`, seguido de la Privacy Policy de Redwood (texto proporcionado por Redwood) en `src/components/privacy-policy.tsx`. Debe revisarlo un abogado. |
| **Términos de uso** | Redactados según el funcionamiento de la plataforma en `src/components/terms-of-use.tsx`. Deben revisarlos los asesores legales de Redwood. |
| **Correo transaccional** | Conectado con **Resend** (`EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM` con dominio verificado). Sin proveedor, los correos quedan en Admin › Correos y el enlace de invitación se muestra al administrador. Cada envío y su estado quedan registrados. |
| Antivirus de archivos, verificación en dos pasos, calendario y videollamada | No incluidos; señalados en Admin › Integraciones. |
| Almacenamiento de archivos | Disco local en desarrollo; Supabase Storage (bucket privado) en Vercel. |
| Visor protegido | Los PDF y las imágenes se abren en el visor del navegador con marca de agua. Un visor que impida capturas no es posible en la web; XLSX y DOCX en modo lectura requieren conversión a PDF (pendiente). |

No se muestran certificaciones ni distintivos de verificación.

## Publicar en Vercel + Supabase (recomendado)

La plataforma ya está preparada: en Vercel usa PostgreSQL de Supabase para los datos y
Supabase Storage (bucket **privado**) para los archivos. La compilación (`npm run vercel-build`)
genera el esquema PostgreSQL, lo aplica a la base, carga los datos de demostración si la base está
vacía y `SEED_DEMO=true`, y compila. Probado de punta a punta con PostgreSQL 16: las 15 pruebas pasan.

**1. Supabase** (supabase.com → New project; anote la contraseña de la base)
- *Project Settings → Database → Connection string*:
  - **Transaction pooler** (puerto 6543) → `DATABASE_URL`, añadiendo al final `?pgbouncer=true&connection_limit=1`
  - **Session pooler** (puerto 5432) → `DIRECT_URL`
  (reemplace `[YOUR-PASSWORD]` por la contraseña de la base)
- *Project Settings → API*: **Project URL** → `SUPABASE_URL`; **service_role** (secreta) → `SUPABASE_SERVICE_ROLE_KEY`.
- No hace falta crear el bucket: la plataforma crea `documentos-privados` como privado y se niega a usar uno público.

**2. Vercel** (vercel.com → Add New → Project → importe `RedwoodCP/Pagina-web-IB`)
- *Settings → Git → Production Branch*: `claude/business-marketplace-platform-2p014z` (o la rama donde fusione el código).
- *Environment Variables*:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Transaction pooler + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Session pooler |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `APP_SECRET` | 64 caracteres aleatorios (`openssl rand -hex 32` o cualquier generador) |
| `APP_URL` | la dirección que le asigne Vercel, p. ej. `https://pagina-web-ib.vercel.app` |
| `SHOW_DEMO_DATA` / `SEED_DEMO` | `true` para la demostración; `false` al operar con datos reales |

- *Deploy*. Al terminar, abra la dirección y entre con las cuentas de demostración.
- Si `APP_URL` cambia (dominio propio), actualícela y vuelva a desplegar: se usa en los enlaces de invitación.

**Límites en Vercel:** cada archivo admite hasta 4 MB (límite de Vercel para el cuerpo de una petición;
`MAX_UPLOAD_MB` lo ajusta en otros servidores). Para archivos grandes, el siguiente paso es la carga
directa a Supabase con URL firmada de subida.

**Pasar a datos reales:** `SHOW_DEMO_DATA=false` y `SEED_DEMO=false`; elimine los datos demo
(`npm run demo:purge -- --confirmar` con las variables de Supabase en su terminal) y cree el primer
administrador (`npm run admin:create -- correo "Nombre"`). Conecte correo y firma, y reemplace los textos legales.

## Publicar en otro servidor

Cualquier servidor Node 20+ sirve: con las mismas variables use `npm run vercel-build && npm start`.
Sin Supabase Storage, defina `STORAGE_DIR` en un disco persistente con respaldo (la compilación de Vercel
exige Supabase porque su disco no es persistente). La zona horaria se fija con `APP_TIMEZONE`
(por defecto `America/Mexico_City`).

## Pendiente de decisión

- **Nombre de la plataforma:** Confidant (se muestra «CONFIDANT · Por Redwood Capital Partners»; `PLATFORM_NAME` permite cambiarlo).
- **Logotipo.** Se recortó del manual de marca (variantes 1 y RW) sin redibujarlo. Para máxima nitidez, reemplace `public/brand/redwood-logo*.png` por los archivos originales en alta resolución o SVG.
