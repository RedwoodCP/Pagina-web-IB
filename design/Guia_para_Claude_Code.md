# Guía para Claude Code — [Nombre de la plataforma]

Prototipo de referencia: `Plataforma Prototipo.dc.html`. Usa la barra **PROTOTIPO** (arriba) para saltar entre pantallas, cambiar el perfil (miembro / asesor / administrador) y la vista (escritorio / celular). Todos los datos son ficticios.

## 1. Mapa de pantallas

| Clave | Pantalla | Rol | Shell |
|---|---|---|---|
| `landing` | Página pública | Público | Sin barra lateral |
| `solicitud` → `solicitud-ok` → `pendiente` | Solicitud de membresía, confirmación y estado | Público | Encabezado claro |
| `invitacion` | Aceptar invitación (crear contraseña) | Invitado | Pantalla dividida |
| `login` | Iniciar sesión | Miembro | Pantalla dividida |
| `perfil` | Configuración del perfil en 4 pasos (persona, organización, uso, intereses) | Miembro | Encabezado claro |
| `panel` | Panel del comprador | Miembro | App |
| `catalogo` | Catálogo privado con búsqueda y filtros | Miembro | App |
| `detalle` | Detalle de oportunidad anónima | Miembro | App |
| `nda` | Flujo NDA: revisar → firmante → firma → estado | Miembro | App |
| `espacio` | Espacio privado: resumen, sala de documentos, preguntas, llamada | Miembro autorizado | App |
| `vendedor` | Publicaciones + seguimiento de interesados | Miembro / asesor | App |
| `publicar` | Asistente de publicación en 6 pasos | Miembro / asesor | App |
| `admin` | Solicitudes, invitaciones, publicaciones, accesos (pestañas) | Administrador | App |
| `sistema` | Sistema de diseño | Referencia | App |

Recorridos conectados:
- Invitación → perfil → panel/catálogo → detalle → NDA → (autorización) → espacio privado → documentos.
- Vendedor → nueva publicación → teaser y documentos → vista previa → envío → aparece en Admin › Publicaciones.
- Admin → aprobar solicitud (genera invitación «Enviada») → aprobar publicación → gestionar accesos.

## 2. Modelo de estados (crítico)

Por **usuario × oportunidad** hay dos máquinas de estado independientes:

- `nda`: `none` → `pendiente_firma` (al solicitar información) → `firmado`
- `acceso`: `none` → `pendiente` (al firmar) → `autorizado` | `rechazado`; `autorizado` → `revocado`; `rechazado`/`revocado` → `autorizado` (restaurar)

Reglas:
- Firmar el NDA **nunca** concede acceso; solo crea una solicitud de acceso `pendiente`.
- El acceso lo decide el vendedor o su asesor (y excepcionalmente el administrador).
- Con acceso autorizado, **cada documento** conserva su permiso: `descarga`, `lectura` (visor sin descarga) o `restringido` (requiere solicitud específica → `solicitado`).
- Revocar el acceso no anula el NDA (vigencia 24 meses).

Otros estados:
- Invitación: `enviada` | `aceptada` | `vencida` (14 días) | `revocada`.
- Solicitud de membresía: `pendiente` | `aprobada` | `rechazada`. Aprobar genera una invitación.
- Publicación: `borrador` | `revision` | `publicada` | `cambios`.

## 3. Roles y permisos

| Capacidad | Público | Miembro (compra y venta) | Asesor representante | Admin |
|---|---|---|---|---|
| Ver landing / solicitar acceso | ✓ | | | |
| Ver catálogo anónimo | | ✓ | ✓ | ✓ (solo lectura) |
| Solicitar info / firmar NDA | | ✓ | ✓ (para un cliente) | |
| Ver espacio privado | | Solo si `acceso=autorizado` | Ídem | Auditoría |
| Publicar empresa | | ✓ (propia) | ✓ (mandatos) | |
| Autorizar / rechazar / revocar acceso | | Sus publicaciones | Sus mandatos | Todas |
| Aprobar membresías y publicaciones, invitar | | | | ✓ |

Una persona puede comprar y vender con **una sola cuenta**: la navegación muestra las secciones «Compra» y «Venta» a la vez.

Confidencialidad antes de autorización: no exponer nombre, razón social, logotipo, fotos identificables, ciudad exacta ni archivos confidenciales — tampoco en miniaturas, metadatos, URLs, nombres de archivo ni respuestas de API. Identificador anónimo `RW-####`. Métricas marcadas «Solo autorizados» deben omitirse del payload (no solo ocultarse en UI); mostrar «Confidencial».

## 4. Sistema de diseño

- **Tipografía:** Source Sans 3 (300, 400, 600, 700). Display 68/300 · H1 40/300 · H2 22/600 · cuerpo 15–17/400 · etiquetas 11–12/600 en mayúsculas con tracking 0.14–0.18em · cifras con `tabular-nums`.
- **Color (identidad Redwood):** `#1A1A1A` tinta · `#2F2F2F` · `#444444` · `#585858` texto de apoyo · `#808080` · `#AEAEAE` texto sobre oscuro · `#F0F0F0` · `#F3F3F3` · `#F5F5F5` · `#FAFAFA` fondo app · `#FFFFFF` superficies. Bordes `rgba(26,26,26,.1)`–`.3`.
- **Estados (derivados, apagados):** ok `oklch(.96 .025 155)/oklch(.38 .07 155)`, pendiente `oklch(.97 .03 85)/oklch(.42 .09 70)`, error `oklch(.96 .02 25)/oklch(.45 .13 25)`, neutro `#F3F3F3/#444444`. Siempre ícono + texto.
- **Forma:** radio 2 px; sin sombras (excepto notificación toast); espaciado base 4 (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Iconos:** Material Symbols Outlined, peso 300.
- **Fondo de marca:** `assets/degradado.png` solo en hero y pantallas de acceso. Logotipo `assets/redwood-logo.png` (invertir sobre oscuro).

Componentes a extraer: `Button` (primario, secundario, enlace, deshabilitado, cargando, control-prototipo), `TextField` / `Select` / `Textarea` / `Checkbox` con error, `Chip` (toggle, aria-pressed), `ActiveFilter` (removible), `StatusBadge` (mapa de estados), `OpportunityCard` (fila catálogo y tarjeta compacta), `MetricGrid`, `Stepper` (vertical de proceso y horizontal de asistente), `Tabs`, `DocumentRow` con permiso, `EmptyState`, `Skeleton`, `Toast`, `AppShell` (barra lateral oscura + barra superior + navegación inferior móvil).

## 5. Comportamiento adaptable

- Punto de quiebre principal: **760 px**.
- ≥760: barra lateral fija de 248 px; catálogo con columna de filtros de 268 px; detalle con panel de proceso fijo (sticky) de 360 px.
- <760: barra lateral → navegación inferior de 4 elementos; filtros en panel desplegable «Filtros · n»; métricas en 2 columnas; asistente muestra «Paso x de 6»; tablas se convierten en filas apiladas (flex-wrap).
- Objetivos táctiles ≥ 44 px en controles principales.

## 6. Simulado vs. integraciones pendientes

| En el prototipo | Integración real pendiente |
|---|---|
| Firma electrónica escribiendo el nombre | Proveedor de firma electrónica (evidencia, sello de tiempo, PDF firmado) |
| Envío de correos (invitación, confirmaciones) | Servicio transaccional de correo + plantillas |
| Autenticación sin validar contraseña; 2FA rotulado | Auth con contraseñas, 2FA, sesiones, invitaciones con token de un solo uso |
| Carga de archivos con progreso falso; error de formato simulado | Almacenamiento cifrado, antivirus, validación de tipo/tamaño |
| Visor y descarga con «marca de agua» | Visor protegido con marca de agua dinámica y registro de accesos |
| Agendar llamada con horarios fijos | Integración de calendario / videollamada |
| Botones «Control del prototipo» (decisión del vendedor, aprobación) | Eliminar; las decisiones vienen de vendedor/asesor/admin reales |
| Datos y organizaciones ficticias | Base de datos, auditoría y bitácora de eventos |

No se muestran certificaciones ni distintivos de verificación. Si se agregan, deben explicar qué verificó el equipo y cuándo.
