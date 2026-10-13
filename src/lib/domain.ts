// Catálogos, estados y etiquetas compartidos por servidor y cliente.

export const SECTORS = [
  "Manufactura",
  "Distribución",
  "Tecnología",
  "Salud",
  "Consumo",
  "Servicios industriales",
  "Agroindustria",
  "Educación",
  "Logística",
  "Servicios financieros",
  "Construcción e inmobiliario",
  "Energía",
] as const;

export const REGIONS = ["Noreste", "Noroeste", "Bajío", "Centro", "Occidente", "Sureste"] as const;

export const DEAL_TYPES = [
  "Venta total",
  "Venta mayoritaria",
  "Participación minoritaria",
  "Fusión",
  "Capital de crecimiento",
] as const;

export const DEAL_TYPE_DESC: Record<string, string> = {
  "Venta total": "El propietario busca vender el 100% de las acciones.",
  "Venta mayoritaria":
    "Venta de una participación de control (más del 50%); los fundadores pueden conservar una parte.",
  "Participación minoritaria": "Entrada de un socio con menos del 50%, sin cambio de control.",
  Fusión: "Integración con otra empresa del sector mediante combinación de negocios.",
  "Capital de crecimiento":
    "Inyección de capital para financiar expansión a cambio de una participación minoritaria.",
};

export const SECTOR_ICON: Record<string, string> = {
  Manufactura: "precision_manufacturing",
  Distribución: "local_shipping",
  Tecnología: "memory",
  Salud: "medical_services",
  Consumo: "shopping_basket",
  "Servicios industriales": "engineering",
  Agroindustria: "agriculture",
  Educación: "school",
  Logística: "conveyor_belt",
  "Servicios financieros": "account_balance",
  "Construcción e inmobiliario": "apartment",
  Energía: "bolt",
};

export const EMPLOYEE_RANGES = ["1–10", "10–50", "50–100", "100–150", "150–250", "250–500", "500+"] as const;

export const ORG_TYPES: Record<string, string> = {
  fondo: "Fondo de capital privado",
  family_office: "Family office",
  corporativo: "Corporativo estratégico",
  banca_inversion: "Banca de inversión / boutique de M&A",
  empresa: "Empresa (propietario o directivo)",
  particular: "Inversionista particular",
  otro: "Otro",
};

export const INTERESTS: Record<string, string> = {
  comprar: "Comprar",
  vender: "Vender",
  ambos: "Comprar y vender",
  asesorar: "Asesorar a un cliente",
};

export const PROFILES: Record<string, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  ambos: "Comprador y vendedor",
  asesor: "Asesor representante",
};

export const RELATIONSHIP: Record<string, string> = {
  propietario: "Propietario/a o accionista",
  directivo: "Directivo/a",
  asesor: "Asesor representante",
};

export const CURRENCIES = ["USD", "MXN"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_PREFIX: Record<string, string> = { USD: "US$", MXN: "MXN $" };

export const DOC_CATEGORIES = ["Financiera", "Comercial", "Legal", "Operativa", "Personal"] as const;

export const NDA_VERSION = "NDA-UNI-2026.1";
export const NDA_VALIDITY_MONTHS = 24;
export const INVITATION_DAYS = 14;

// ---------------------------------------------------------------------------
// Estados

export type Tone = "neutral" | "warn" | "ok" | "err" | "dark";
export type Badge = { label: string; tone: Tone; icon: string };
const B = (label: string, tone: Tone, icon: string): Badge => ({ label, tone, icon });

export type NdaStatus = "none" | "pendiente_firma" | "firmado";
export type AccessStatus = "none" | "pendiente" | "autorizado" | "rechazado" | "revocado";

export const NDA_BADGE: Record<string, Badge> = {
  none: B("Sin solicitar", "neutral", "remove"),
  pendiente_firma: B("NDA pendiente", "warn", "edit_document"),
  firmado: B("NDA firmado", "ok", "task"),
  // aceptación registrada sin proveedor de firma
  aceptado: B("NDA aceptado", "ok", "task"),
};

export const ACCESS_BADGE: Record<string, Badge> = {
  none: B("Sin acceso", "neutral", "lock"),
  pendiente: B("Acceso pendiente", "warn", "schedule"),
  autorizado: B("Acceso autorizado", "ok", "lock_open"),
  rechazado: B("Acceso rechazado", "err", "block"),
  revocado: B("Acceso revocado", "err", "history"),
};

export const INVITATION_BADGE: Record<string, Badge> = {
  enviada: B("Enviada", "warn", "send"),
  aceptada: B("Aceptada", "ok", "check_circle"),
  vencida: B("Vencida", "neutral", "event_busy"),
  revocada: B("Revocada", "err", "block"),
};

export const MEMBERSHIP_BADGE: Record<string, Badge> = {
  pendiente: B("Pendiente", "warn", "schedule"),
  aprobada: B("Aprobada", "ok", "check_circle"),
  rechazada: B("Rechazada", "err", "block"),
};

export const LISTING_BADGE: Record<string, Badge> = {
  publicada: B("Publicada", "ok", "public"),
  revision: B("En revisión", "warn", "pending"),
  borrador: B("Borrador", "neutral", "draft"),
  cambios: B("Cambios solicitados", "err", "edit_note"),
  retirada: B("Retirada", "neutral", "archive"),
};

export const DOC_PERM_BADGE: Record<string, Badge> = {
  descarga: B("Ver y descargar", "ok", "download"),
  lectura: B("Solo lectura", "neutral", "visibility"),
  restringido: B("Restringido", "err", "lock"),
  solicitado: B("Acceso solicitado", "warn", "schedule"),
  rechazado: B("Solicitud rechazada", "err", "block"),
};

export const DOC_PERM_LABEL: Record<string, string> = {
  descarga: "Ver y descargar",
  lectura: "Solo lectura (visor)",
  restringido: "Restringido (por solicitud)",
};

export const MEETING_BADGE: Record<string, Badge> = {
  solicitada: B("Solicitada", "warn", "schedule"),
  confirmada: B("Confirmada", "ok", "event_available"),
  rechazada: B("No disponible", "err", "event_busy"),
  cancelada: B("Cancelada", "neutral", "close"),
};

export const INTEREST_LEVELS: Record<string, string> = {
  evaluando: "Evaluando",
  interesado: "Interesado",
  muy_interesado: "Muy interesado",
  descartado: "Descartado",
};

export const DEMO_BADGE: Badge = B("Demo", "neutral", "science");

export function invitationState(inv: { status: string; expiresAt: Date }): string {
  if (inv.status === "enviada" && inv.expiresAt.getTime() < Date.now()) return "vencida";
  return inv.status;
}

// ---------------------------------------------------------------------------
// Filtros de rango del catálogo (montos en millones de la moneda seleccionada)

export type Range = { key: string; label: string; min?: number; max?: number };

export const MARGIN_RANGES: Range[] = [
  { key: "neg", label: "Menos de 0% (pérdidas)", max: 0 },
  { key: "0-10", label: "0% – 10%", min: 0, max: 10 },
  { key: "10-20", label: "10% – 20%", min: 10, max: 20 },
  { key: "20-30", label: "20% – 30%", min: 20, max: 30 },
  { key: "30-40", label: "30% – 40%", min: 30, max: 40 },
  { key: "40+", label: "Más de 40%", min: 40 },
];

const money = (c: string) => CURRENCY_PREFIX[c] ?? c;

export function salesRanges(c: string): Range[] {
  const p = money(c);
  if (c === "MXN")
    return [
      { key: "0-100", label: `Hasta ${p} 100 M`, max: 100 },
      { key: "100-250", label: `${p} 100 – 250 M`, min: 100, max: 250 },
      { key: "250-500", label: `${p} 250 – 500 M`, min: 250, max: 500 },
      { key: "500-1000", label: `${p} 500 – 1,000 M`, min: 500, max: 1000 },
      { key: "1000+", label: `Más de ${p} 1,000 M`, min: 1000 },
    ];
  return [
    { key: "0-5", label: `Hasta ${p} 5 M`, max: 5 },
    { key: "5-10", label: `${p} 5 – 10 M`, min: 5, max: 10 },
    { key: "10-25", label: `${p} 10 – 25 M`, min: 10, max: 25 },
    { key: "25-50", label: `${p} 25 – 50 M`, min: 25, max: 50 },
    { key: "50+", label: `Más de ${p} 50 M`, min: 50 },
  ];
}

export function ebitdaRanges(c: string): Range[] {
  const p = money(c);
  if (c === "MXN")
    return [
      { key: "neg", label: "Negativo (pérdidas)", max: 0 },
      { key: "0-20", label: `${p} 0 – 20 M`, min: 0, max: 20 },
      { key: "20-50", label: `${p} 20 – 50 M`, min: 20, max: 50 },
      { key: "50-100", label: `${p} 50 – 100 M`, min: 50, max: 100 },
      { key: "100+", label: `Más de ${p} 100 M`, min: 100 },
    ];
  return [
    { key: "neg", label: "Negativo (pérdidas)", max: 0 },
    { key: "0-1", label: `${p} 0 – 1 M`, min: 0, max: 1 },
    { key: "1-2", label: `${p} 1 – 2 M`, min: 1, max: 2 },
    { key: "2-5", label: `${p} 2 – 5 M`, min: 2, max: 5 },
    { key: "5+", label: `Más de ${p} 5 M`, min: 5 },
  ];
}

export function inRanges(v: number, ranges: Range[], keys: string[]): boolean {
  return ranges
    .filter((r) => keys.includes(r.key))
    .some((r) => (r.min === undefined || v >= r.min) && (r.max === undefined || v < r.max));
}
