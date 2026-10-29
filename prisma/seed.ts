/* Datos de demostración. Todo lo que crea este script lleva isDemo=true y es ficticio.
   Uso: npm run db:seed   (o npm run db:reset para empezar de cero) */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { putObject, storageMode } from "../src/lib/storage";

const db = new PrismaClient();
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const DEMO_PASSWORD = "Demo2026segura";
const ascii = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—]/g, "-");
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400_000);

async function demoPdf(title: string, lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("DOCUMENTO DE DEMOSTRACION - DATOS FICTICIOS", { x: 40, y: 812, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText(title, { x: 40, y: 740, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
  lines.forEach((l, i) => page.drawText(l, { x: 40, y: 700 - i * 20, size: 11, font, color: rgb(0.27, 0.27, 0.27) }));
  return Buffer.from(await pdf.save());
}

const store = (buf: Buffer) => putObject(buf);

const OPPS = [
  { code: "RW-1042", sector: "Industrial y Manufactura", title: "Fabricante de empaques flexibles para consumo masivo", region: "Bajío", sales: 18.4, ebitda: 3.1, pmin: 21, pmax: 24, deal: "Venta mayoritaria", teaser: true, years: 22, emp: "150–250", pub: 11, summary: "Empresa familiar con dos plantas y contratos multianuales con marcas de alimentos y cuidado personal.", hl: ["Más de 40 clientes recurrentes", "Capacidad instalada utilizada al 68%", "Fundadores dispuestos a una transición de 18 meses"], legal: "Empaques Altiplano, S.A. de C.V.", city: "León, Guanajuato", visPrice: "miembros" },
  { code: "RW-1187", sector: "Transporte y Logística", title: "Distribuidor farmacéutico regional con almacenes propios", region: "Noreste", sales: 42.0, ebitda: 4.6, pmin: 38, pmax: 42, deal: "Venta total", teaser: true, years: 31, emp: "250–500", pub: 25, summary: "Cobertura de más de 1,200 puntos de venta con flotilla propia y licencias sanitarias vigentes.", hl: ["Tres centros de distribución", "Contratos con cadenas regionales", "Equipo directivo profesionalizado"], legal: "Distribuidora Médica del Norte, S.A. de C.V.", city: "Monterrey, Nuevo León", visPrice: "miembros" },
  { code: "RW-1215", sector: "Tecnología y Telecomunicaciones", title: "Plataforma SaaS de gestión logística para PyMEs", region: "Centro", sales: 6.2, ebitda: 1.7, pmin: 14, pmax: 16, deal: "Participación minoritaria", teaser: true, years: 7, emp: "50–100", pub: 4, summary: "Ingresos recurrentes por suscripción, con clientes en México y Centroamérica.", hl: ["85% de ingresos recurrentes", "Retención neta de ingresos superior al 100%", "Busca socio para expansión regional"], legal: "Rutalia Software, S.A.P.I. de C.V.", city: "Ciudad de México", visPrice: "miembros" },
  { code: "RW-1309", sector: "Salud", title: "Red de clínicas dentales con 14 sucursales", region: "Occidente", sales: 9.8, ebitda: 1.9, pmin: null, pmax: null, deal: "Venta mayoritaria", teaser: false, years: 15, emp: "100–150", pub: 16, summary: "Operación estandarizada con agenda centralizada y convenios con aseguradoras.", hl: ["14 sucursales en 3 ciudades", "Convenios con aseguradoras", "Potencial de expansión por franquicia"], legal: "Clínicas Sonrisa Integral, S.C.", city: "Guadalajara, Jalisco", visPrice: "miembros" },
  { code: "RW-1388", sector: "Alimentos y Bebidas", title: "Productor de botanas horneadas con marca propia", region: "Centro", sales: 27.5, ebitda: 3.9, pmin: 30, pmax: 34, deal: "Venta total", teaser: true, years: 19, emp: "250–500", pub: 8, summary: "Marca reconocida en autoservicios del centro del país y línea de maquila para terceros.", hl: ["Presencia en 3,000 puntos de venta", "Planta con capacidad de ampliación", "Portafolio de 28 productos"], legal: "Horneados La Vereda, S.A. de C.V.", city: "Querétaro, Querétaro", visPrice: "autorizados" },
  { code: "RW-1452", sector: "Energía y Medio Ambiente", title: "Ingeniería y mantenimiento para la industria energética", region: "Sureste", sales: 12.1, ebitda: 2.0, pmin: 15, pmax: 17, deal: "Fusión", teaser: false, years: 12, emp: "150–250", pub: 13, summary: "Servicios de mantenimiento mecánico y eléctrico con contratos marco de largo plazo.", hl: ["Contratos marco a 3 años", "Personal técnico especializado", "Busca integración con un grupo afín"], legal: "Ingeniería Peninsular, S.A. de C.V.", city: "Mérida, Yucatán", visPrice: "miembros" },
  { code: "RW-1552", sector: "Agronegocios", title: "Productor y exportador de berries", region: "Occidente", sales: 33.0, ebitda: 6.3, pmin: 45, pmax: 50, deal: "Venta mayoritaria", teaser: true, years: 14, emp: "500+", pub: 21, summary: "Más de 600 hectáreas en producción, empaque propio y venta a distribuidores de Norteamérica.", hl: ["Empaque y cadena de frío propios", "80% de ventas de exportación", "Contratos anuales con distribuidores"], legal: "Berries del Valle, S.P.R. de R.L.", city: "Zamora, Michoacán", visPrice: "miembros" },
  { code: "RW-1603", sector: "Educación", title: "Grupo de colegios privados bilingües K-12", region: "Noreste", sales: 8.4, ebitda: 2.3, pmin: null, pmax: null, deal: "Venta total", teaser: false, hide: true, years: 26, emp: "250–500", pub: 28, summary: "Tres campus con matrícula estable y lista de espera en el nivel primaria.", hl: ["Tres campus propios", "Más de 2,400 alumnos", "Ocupación promedio del 92%"], legal: "Colegios Cumbres del Norte, A.C.", city: "Monterrey, Nuevo León", visPrice: "miembros" },
  { code: "RW-0934", sector: "Transporte y Logística", title: "Operador de logística de última milla", region: "Centro", sales: 15.0, ebitda: 1.4, pmin: 11, pmax: 13, deal: "Capital de crecimiento", teaser: true, years: 9, emp: "250–500", pub: 42, summary: "Red de microcentros urbanos y flotilla eléctrica para comercio electrónico.", hl: ["12 microcentros urbanos", "Clientes de comercio electrónico", "Plan de expansión a 4 ciudades"], legal: "Entregas Ágiles Metropolitanas, S.A. de C.V.", city: "Ciudad de México", visPrice: "miembros" },
  { code: "RW-1611", sector: "Inmobiliario", title: "Desarrolladora de naves industriales en renta", region: "Bajío", sales: 480, ebitda: 210, pmin: 2400, pmax: 2700, deal: "Venta mayoritaria", teaser: false, years: 11, emp: "50–100", pub: 6, summary: "Portafolio de naves industriales arrendadas a empresas manufactureras con contratos en dólares y pesos.", hl: ["Ocupación del 96%", "Contratos de arrendamiento de 5 a 10 años", "Reserva territorial para 3 naves adicionales"], legal: "Parques Industriales del Bajío, S.A. de C.V.", city: "Silao, Guanajuato", visPrice: "miembros", currency: "MXN" },
];

async function main() {
  console.log(`Creando datos de demostración… (archivos en: ${storageMode()})`);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const org = async (name: string, type: string) => db.organization.create({ data: { name, type, country: "México", isDemo: true } });
  const user = async (email: string, name: string, data: Record<string, unknown> = {}) =>
    db.user.create({ data: { email, name, passwordHash: hash, isDemo: true, onboardingDone: true, ...data } });

  const oRedwood = await org("Redwood Capital Partners", "banca_inversion");
  const oFerran = await org("Grupo Ferrán Inversiones", "family_office");
  const oBravo = await org("Bravo & Asociados", "banca_inversion");
  const oSierra = await org("Fondo Sierra Capital", "fondo");
  const oValmar = await org("Grupo Industrial Valmar", "corporativo");
  const oAndes = await org("Andes Partners", "banca_inversion");
  const oLumbre = await org("Family Office Lumbre", "family_office");
  const oNorte = await org("Capital Norte", "fondo");
  const oOcotal = await org("Grupo Ocotal", "corporativo");
  const oVend = await org("Accionistas independientes (demo)", "empresa");

  const admin = await user("admin@demo.redwood.test", "Lucía Méndez", { isAdmin: true, canBuy: false, title: "Directora de la red", organizationId: oRedwood.id });
  const mariana = await user("mariana.robles@demo.redwood.test", "Mariana Robles", { canBuy: true, canSell: true, title: "Directora de inversiones", organizationId: oFerran.id, prefSectors: JSON.stringify(["Industrial y Manufactura", "Salud"]), prefRegions: JSON.stringify(["Bajío", "Centro"]), ticketMin: 5, ticketMax: 25 });
  const javier = await user("javier.ortega@demo.redwood.test", "Javier Ortega", { canBuy: true, canSell: true, isAdvisor: true, title: "Socio", organizationId: oBravo.id, prefSectors: JSON.stringify(["Transporte y Logística", "Salud"]) });
  const vendedor = await user("vendedor@demo.redwood.test", "Ernesto Valdés", { canBuy: false, canSell: true, title: "Accionista", organizationId: oVend.id });
  const buyers = {
    sierra: await user("a.montes@demo.redwood.test", "Andrea Montes", { organizationId: oSierra.id, title: "Socia" }),
    valmar: await user("pablo@demo.redwood.test", "Pablo Ruiz", { organizationId: oValmar.id, title: "Director de desarrollo corporativo" }),
    andes: await user("andes@demo.redwood.test", "Sofía Andrade", { organizationId: oAndes.id, title: "Directora", isAdvisor: true }),
    lumbre: await user("lumbre@demo.redwood.test", "Rodrigo Lumbreras", { organizationId: oLumbre.id, title: "Director" }),
    norte: await user("norte@demo.redwood.test", "Luis Ruiz", { organizationId: oNorte.id, title: "Asociado" }),
    ocotal: await user("ocotal@demo.redwood.test", "Marta Ochoa", { organizationId: oOcotal.id, title: "Directora de finanzas" }),
  };

  // Oportunidades publicadas
  const owners: Record<string, { id: string; org: string }> = {
    "RW-1042": { id: mariana.id, org: oFerran.id },
    "RW-1187": { id: javier.id, org: oBravo.id },
  };
  const listings: Record<string, { id: string }> = {};
  for (const o of OPPS) {
    const own = owners[o.code] ?? { id: vendedor.id, org: oVend.id };
    const cur = o.currency ?? "USD";
    const l = await db.listing.create({
      data: {
        code: o.code, status: "publicada", step: 6, isDemo: true,
        legalName: o.legal, city: o.city, foundedYear: 2026 - o.years, ownership: "Dos socios fundadores",
        advisorName: o.code === "RW-1187" ? "Bravo & Asociados (ficticio)" : null,
        financialHistory: JSON.stringify([
          { year: 2023, sales: +(o.sales * 0.84).toFixed(1), ebitda: +(o.ebitda * 0.8).toFixed(1) },
          { year: 2024, sales: +(o.sales * 0.92).toFixed(1), ebitda: +(o.ebitda * 0.9).toFixed(1) },
          { year: 2025, sales: o.sales, ebitda: o.ebitda },
        ]),
        relationship: o.code === "RW-1187" ? "asesor" : "propietario",
        sector: o.sector, region: o.region, title: o.title, summary: o.summary, highlights: JSON.stringify(o.hl),
        dealType: o.deal, yearsOperating: o.years, employees: o.emp, currency: cur, fiscalYear: 2025,
        sales: o.sales, ebitda: o.ebitda, priceMin: o.pmin, priceMax: o.pmax, negotiable: o.pmin == null,
        visEbitda: o.hide ? "autorizados" : "miembros", visMargin: o.hide ? "autorizados" : "miembros", visPrice: o.visPrice,
        submittedAt: daysAgo(o.pub + 3), publishedAt: daysAgo(o.pub), createdAt: daysAgo(o.pub + 5),
        ownerId: own.id, organizationId: own.org,
      },
    });
    listings[o.code] = l;
    if (o.teaser) {
      const key = await store(await demoPdf(`Teaser ${o.code}`, [`Sector: ${o.sector}`, `Region: ${o.region}`, o.title.normalize("NFD").replace(/[̀-ͯ]/g, ""), "Documento no confidencial de ejemplo."]));
      await db.listingDocument.create({ data: { listingId: l.id, kind: "teaser", originalName: `Teaser ${o.code}.pdf`, storageKey: key, mime: "application/pdf", size: 4200, category: "Comercial", permission: "lectura", uploadedById: own.id } });
    }
  }
  // Datos opcionales para búsquedas de compra (ficticios)
  await db.listing.update({ where: { code: "RW-1042" }, data: { debtToEbitda: 1.2, intlOps: false, topClientPct: 14 } });
  await db.listing.update({ where: { code: "RW-1552" }, data: { debtToEbitda: 0.8, intlOps: true, topClientPct: 22 } });
  // NDA de la empresa (PDF del vendedor) en dos oportunidades; el resto usa el texto de ejemplo.
  for (const code of ["RW-1042", "RW-1215"]) {
    const key = await store(await demoPdf(`Acuerdo de confidencialidad - Proyecto ${code}`, ["Documento de ejemplo cargado por el vendedor.", `Proyecto ${code}: el Receptor mantendra la confidencialidad de la informacion.`, "Vigencia: 24 meses.", "Texto ficticio para pruebas."]));
    await db.listingDocument.create({ data: { listingId: listings[code]!.id, kind: "nda", originalName: `NDA Proyecto ${code}.pdf`, storageKey: key, mime: "application/pdf", size: 3800, category: "Legal", permission: "lectura", uploadedById: (owners[code] ?? { id: vendedor.id }).id } });
  }
  // Grupo Ocotal excluido de RW-1388 (ejemplo de exclusión por organización)
  await db.listingExclusion.create({ data: { listingId: listings["RW-1388"]!.id, organizationId: oOcotal.id } });

  // Sala de documentos de RW-1187 y RW-1042
  const DOCS: [string, string, string][] = [
    ["Estados financieros auditados 2023–2025", "Financiera", "descarga"],
    ["Modelo financiero y proyecciones", "Financiera", "lectura"],
    ["Memorándum de información confidencial", "Comercial", "descarga"],
    ["Concentración de clientes – principales 20", "Comercial", "restringido"],
    ["Acta constitutiva y poderes", "Legal", "lectura"],
    ["Contratos con proveedores clave", "Legal", "restringido"],
    ["Licencias y permisos de operación", "Operativa", "lectura"],
    ["Organigrama y plantilla", "Personal", "restringido"],
  ];
  for (const code of ["RW-1187", "RW-1042"]) {
    const l = listings[code]!;
    const o = OPPS.find((x) => x.code === code)!;
    for (const [n, cat, perm] of DOCS) {
      const key = await store(await demoPdf(ascii(n), [o.legal.normalize("NFD").replace(/[̀-ͯ]/g, ""), `Categoria: ${cat}`, "Contenido ficticio para pruebas de la sala de documentos."]));
      await db.listingDocument.create({ data: { listingId: l.id, kind: "documento", originalName: `${n}.pdf`, storageKey: key, mime: "application/pdf", size: 180_000 + n.length * 9000, category: cat, permission: perm, uploadedById: owners[code]!.id, createdAt: daysAgo(10) } });
    }
  }

  // Procesos de Mariana como compradora
  const eng = async (code: string, userId: string, orgName: string, nda: string, acc: string, ago: number, extra: Record<string, unknown> = {}) => {
    const e = await db.engagement.create({
      data: { listingId: listings[code]!.id, userId, organizationName: orgName, ndaStatus: nda, accessStatus: acc, isDemo: true, createdAt: daysAgo(ago), accessDecidedAt: acc !== "none" && acc !== "pendiente" ? daysAgo(ago - 2) : null, ...extra },
    });
    if (nda === "firmado") {
      const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
      await db.ndaSignature.create({
        data: { engagementId: e.id, ndaVersion: "NDA-UNI-2026.1", textHash: sha("demo"), signerName: u.name, signerTitle: u.title ?? "—", signerOrg: orgName, signerEmail: u.email, representation: "organizacion", method: "registro_interno", status: "completado", completedAt: daysAgo(ago - 1), validUntil: daysAhead(700) },
      });
    }
    return e;
  };
  await eng("RW-1187", mariana.id, oFerran.name, "firmado", "autorizado", 8, { interestLevel: "interesado", accessDecidedById: javier.id });
  await eng("RW-1309", mariana.id, oFerran.name, "pendiente_firma", "none", 2);
  await eng("RW-1552", mariana.id, oFerran.name, "firmado", "pendiente", 7);
  await eng("RW-1603", mariana.id, oFerran.name, "firmado", "rechazado", 10, { accessNote: "El vendedor prioriza compradores estratégicos del sector educativo." });
  await eng("RW-0934", mariana.id, oFerran.name, "firmado", "revocado", 14, { accessNote: "El proceso entró en fase de exclusividad con otro comprador." });
  for (const code of ["RW-1042", "RW-1187", "RW-1388"]) await db.favorite.create({ data: { userId: mariana.id, listingId: listings[code]!.id } });

  // Interesados en RW-1042 (publicación de Mariana)
  await eng("RW-1042", buyers.sierra.id, oSierra.name, "firmado", "pendiente", 1);
  await eng("RW-1042", buyers.valmar.id, oValmar.name, "firmado", "autorizado", 4, { accessDecidedById: mariana.id, interestLevel: "muy_interesado" });
  await eng("RW-1042", buyers.andes.id, oAndes.name, "pendiente_firma", "none", 2, { representation: "tercero", clientName: "Comprador estratégico (confidencial)" });
  await eng("RW-1042", buyers.lumbre.id, oLumbre.name, "firmado", "pendiente", 3);
  await eng("RW-1042", buyers.norte.id, oNorte.name, "firmado", "rechazado", 10, { accessDecidedById: mariana.id });
  await eng("RW-1042", buyers.ocotal.id, oOcotal.name, "firmado", "revocado", 15, { accessDecidedById: mariana.id });

  // Preguntas y reunión en RW-1187
  await db.question.create({ data: { listingId: listings["RW-1187"]!.id, askerId: mariana.id, body: "¿Qué porcentaje de las ventas concentran los cinco clientes principales?", answer: "Los cinco clientes principales representan el 38% de las ventas de 2025. El detalle está en el documento de concentración de clientes.", answeredById: javier.id, answeredAt: daysAgo(3), createdAt: daysAgo(4) } });
  await db.question.create({ data: { listingId: listings["RW-1187"]!.id, askerId: mariana.id, body: "¿Existen contingencias fiscales o laborales relevantes?", createdAt: daysAgo(2) } });
  await db.question.create({ data: { listingId: listings["RW-1042"]!.id, askerId: buyers.valmar.id, body: "¿Los contratos multianuales incluyen cláusulas de cambio de control?", createdAt: daysAgo(1) } });

  // En revisión y borrador
  await db.listing.create({ data: { code: "RW-1721", status: "revision", step: 6, isDemo: true, legalName: "Refacciones Automotrices del Centro, S.A. de C.V.", city: "Celaya, Guanajuato", relationship: "asesor", sector: "Automotriz", region: "Bajío", title: "Comercializadora de refacciones automotrices", summary: "Distribuidor mayorista con 4 sucursales y catálogo de más de 12,000 piezas.", highlights: JSON.stringify(["4 sucursales", "Más de 900 clientes activos", "Plataforma de pedidos en línea"]), dealType: "Venta total", yearsOperating: 17, employees: "100–150", fiscalYear: 2025, sales: 14.2, ebitda: 1.6, priceMin: 12, priceMax: 14, submittedAt: daysAgo(2), ownerId: javier.id, organizationId: oBravo.id } });
  await db.listing.create({ data: { code: "RW-1730", status: "revision", step: 6, isDemo: true, legalName: "Laboratorios Diagnóstico Integral, S.A. de C.V.", city: "Puebla, Puebla", sector: "Salud", region: "Centro", title: "Laboratorio de análisis clínicos con 9 unidades", summary: "Red de laboratorios con convenios hospitalarios y servicio a domicilio.", highlights: JSON.stringify(["9 unidades", "Convenios con 6 hospitales", "Certificación de calidad vigente declarada por el vendedor"]), dealType: "Venta mayoritaria", yearsOperating: 20, employees: "150–250", fiscalYear: 2025, sales: 11.0, ebitda: 2.4, negotiable: true, submittedAt: daysAgo(1), ownerId: vendedor.id, organizationId: oVend.id } });
  await db.listing.create({ data: { code: "RW-1744", status: "borrador", step: 3, isDemo: true, legalName: "Maquinados Industriales del Bajío", sector: "Industrial y Manufactura", region: "Bajío", yearsOperating: 18, employees: "100–150", dealType: "Venta mayoritaria", title: "Taller de maquinado CNC de precisión para la industria automotriz", summary: "Proveedor de segundo nivel con 30 clientes activos, planta propia de 6,000 m² y equipo técnico estable.", priceMin: 12, priceMax: 14, ownerId: mariana.id, organizationId: oFerran.id, createdAt: daysAgo(7) } });

  // Solicitudes de membresía
  const req = (name: string, email: string, organization: string, orgType: string, interest: string, status: string, ago: number) =>
    db.membershipRequest.create({ data: { reference: "SOL-" + randomBytes(3).toString("hex").toUpperCase().slice(0, 5).replace(/[01IO]/g, "7"), name, email, organization, orgType, interest, status, isDemo: true, createdAt: daysAgo(ago), reviewedAt: status !== "pendiente" ? daysAgo(ago - 1) : null, reviewedById: status !== "pendiente" ? admin.id : null } });
  await req("Ricardo Salinas Vela", "r.salinas@demo-capitalandino.test", "Capital Andino", "fondo", "comprar", "pendiente", 1);
  await req("Fernanda Cuevas", "fernanda@demo-cuevashnos.test", "Cuevas Hermanos", "empresa", "vender", "pendiente", 2);
  await req("Tomás Ibarra", "tibarra@demo-ibarraco.test", "Ibarra & Co. Banca de Inversión", "banca_inversion", "asesorar", "pendiente", 3);
  await req("Elena Prieto", "elena@demo-foprieto.test", "Family Office Prieto", "family_office", "ambos", "aprobada", 5);
  await req("Hugo Lara", "hlara@demo-correo.test", "Sin organización", "particular", "comprar", "rechazada", 6);

  // Invitaciones con tokens conocidos (solo demostración)
  const inv = (email: string, profile: string, token: string, status: string, sent: number, expires: Date) =>
    db.invitation.create({ data: { email, profile, tokenHash: sha(token), status, isDemo: true, createdAt: daysAgo(sent), expiresAt: expires, invitedById: admin.id, acceptedAt: status === "aceptada" ? daysAgo(sent - 2) : null, revokedAt: status === "revocada" ? daysAgo(sent - 3) : null } });
  await inv("nuevo.miembro@demo.redwood.test", "ambos", "demo-invitacion-vigente", "enviada", 1, daysAhead(13));
  await inv("elena@demo-foprieto.test", "ambos", randomBytes(24).toString("base64url"), "enviada", 4, daysAhead(10));
  await inv("pablo@demo.redwood.test", "comprador", randomBytes(24).toString("base64url"), "aceptada", 12, daysAgo(-2));
  await inv("l.ruiz@demo-capitalnorte.test", "comprador", "demo-invitacion-vencida", "enviada", 33, daysAgo(19));
  await inv("m.ochoa@demo-ocotal.test", "vendedor", "demo-invitacion-revocada", "revocada", 28, daysAgo(14));

  // Notificaciones iniciales
  await db.notification.createMany({
    data: [
      { userId: mariana.id, text: "Acceso autorizado a RW-1187.", href: "/oportunidades/RW-1187/espacio", createdAt: daysAgo(6) },
      { userId: mariana.id, text: "Nueva oportunidad en Tecnología: RW-1215.", href: "/oportunidades/RW-1215", createdAt: daysAgo(4) },
      { userId: mariana.id, text: "Fondo Sierra Capital firmó el NDA de RW-1042 y espera su decisión.", href: "/venta", createdAt: daysAgo(1) },
    ],
  });
  await db.auditLog.create({ data: { actorId: admin.id, action: "seed.demo", entityType: "sistema", meta: JSON.stringify({ nota: "Carga de datos de demostración" }) } });

  console.log(`\nListo. Contraseña de todas las cuentas demo: ${DEMO_PASSWORD}`);
  console.log("  Admin:              admin@demo.redwood.test");
  console.log("  Compra y venta:     mariana.robles@demo.redwood.test");
  console.log("  Asesor:             javier.ortega@demo.redwood.test");
  console.log("  Solo vendedor:      vendedor@demo.redwood.test");
  console.log("  Comprador (Valmar): pablo@demo.redwood.test");
  console.log("Invitaciones de prueba: /invitacion/demo-invitacion-vigente · -vencida · -revocada");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
