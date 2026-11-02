import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/ui";
import { LandingMotion } from "@/components/landing-motion";
import { DealTunnel } from "@/components/deal-tunnel";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { RegionMap, regionStats } from "@/components/region-map";
import "./landing.css";

const HOW = [
  ["01", "Solicite acceso", "Por invitación de nuestro equipo o mediante una solicitud que revisamos personalmente."],
  ["02", "Explore de forma anónima", "Cada oportunidad muestra un identificador, sector, región y métricas autorizadas, nunca el nombre."],
  ["03", "Firme el NDA", "El acuerdo de confidencialidad se firma por oportunidad, con datos del firmante y registro de estado."],
  ["04", "Acceda con autorización", "El vendedor decide quién entra a su espacio privado y qué documentos puede ver cada comprador."],
];

const PRINCIPLES = [
  ["visibility_off", "Identidad anónima por defecto", "Sin nombres, logotipos ni fotografías identificables antes de la autorización, tampoco en vistas previas."],
  ["contract", "NDA por oportunidad", "Cada operación tiene su propio acuerdo y su propio registro de firma."],
  ["key", "Autorización separada del NDA", "Firmar no desbloquea documentos. El vendedor o su asesor autoriza cada acceso."],
  ["folder_managed", "Permisos por documento", "Lectura, descarga o acceso por solicitud, visibles para todos los participantes."],
  ["history", "Revocación y trazabilidad", "El acceso puede retirarse en cualquier momento y cada consulta queda registrada."],
];

const AUDIENCES = [
  ["person_search", "Compradores", ["Fondos de inversión y family offices", "Corporativos estratégicos", "Filtros por sector, región, ventas y EBITDA"]],
  ["storefront", "Vendedores", ["Empresarios y accionistas", "Publicación anónima con aprobación del equipo", "Control de interesados y documentos"]],
  ["handshake", "Asesores representantes", ["Bancas de inversión y boutiques de M&A", "Gestión de varios mandatos", "Preguntas y reuniones con compradores"]],
] as const;

/** Tarjeta de ejemplo (sin datos reales). Se usa en la primera pantalla y en la secuencia de «Cómo funciona». */
function ExampleCard() {
  return (
    <>
      <div className="ld-card-top">
        <span>ASÍ SE VE UNA OPORTUNIDAD</span>
        <span>EJEMPLO</span>
      </div>
      <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700, letterSpacing: ".06em" }}>
        RW-1042 <span style={{ fontWeight: 400, color: "#AEAEAE", letterSpacing: ".12em" }}>· INDUSTRIAL Y MANUFACTURA</span>
      </div>
      <div style={{ fontSize: 20, lineHeight: 1.3, margin: "8px 0 20px" }}>Fabricante de empaques flexibles para consumo masivo</div>
      <div className="ld-card-metrics">
        <div>
          <div className="ld-card-label">VENTAS</div>
          <div className="num" style={{ fontSize: 20 }}>US$ 18.4 M</div>
        </div>
        <div>
          <div className="ld-card-label">MARGEN EBITDA</div>
          <div className="num" style={{ fontSize: 20 }}>16.8%</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, fontSize: 13, color: "#F0F0F0" }}>
        <Icon name="lock" size={18} />
        Nombre e identidad protegidos hasta autorización
      </div>
    </>
  );
}

export default async function Landing() {
  const user = await getCurrentUser();
  const home = user ? (user.isAdmin ? "/admin/solicitudes" : user.canBuy ? "/panel" : "/venta") : null;
  // Solo agregados (región y sector) de oportunidades publicadas; los datos de demostración siguen la misma regla que el catálogo.
  const published = await db.listing.findMany({ where: { status: "publicada", ...(env.showDemo ? {} : { isDemo: false }) }, select: { region: true, sector: true } });
  const stats = regionStats(published);
  return (
    <div className="ld">
      <LandingMotion />

      <header className="ld-nav on-dark" data-nav>
        <div className="wrap ld-nav-inner">
          <Brand dark />
          <nav aria-label="Acceso" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div className="desktop-only ld-nav-links">
              <a href="#como">Cómo funciona</a>
              <a href="#confidencialidad">Confidencialidad</a>
            </div>
            <Link href={home ?? "/iniciar-sesion"} className="btn btn-ghost-dark" style={{ height: 40, fontSize: 14, padding: "0 16px" }} data-vault={home ? undefined : true}>
              {home ? "Ir a la plataforma" : "Iniciar sesión"}
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------- Primera pantalla: composición por capas ---------- */}
      <section className="hero on-dark ld-hero" data-hero>
        {/* Capas decorativas: se desplazan a distinta profundidad con el cursor (solo escritorio). */}
        <div className="ld-layers" aria-hidden="true">
          <div className="ld-layer ld-plane ld-plane-a" style={{ "--d": -0.6 } as React.CSSProperties} />
          <div className="ld-layer ld-plane ld-plane-b" style={{ "--d": -0.35 } as React.CSSProperties} />
          <img className="ld-layer ld-iso" src="/brand/rw-isotipo-blanco.png" alt="" style={{ "--d": -0.2 } as React.CSSProperties} />
        </div>
        <div className="wrap ld-hero-grid">
          <div className="ld-hero-copy">
            <div className="ld-in" style={{ "--i": 0 } as React.CSSProperties}>
              <div style={{ fontSize: 12, letterSpacing: ".18em", fontWeight: 600, color: "#F0F0F0" }}>
                RED PRIVADA DE TRANSACCIONES · ACCESO POR INVITACIÓN
              </div>
            </div>
            <h1 className="display ld-in" style={{ margin: "20px 0 24px", "--i": 1 } as React.CSSProperties}>
              Compra y venta de empresas, con la discreción que exige cada operación.
            </h1>
            <p className="ld-in" style={{ fontSize: 19, lineHeight: 1.55, color: "#F0F0F0", maxWidth: 580, margin: "0 0 36px", "--i": 2 } as React.CSSProperties}>
              Conectamos a empresarios, fondos de inversión y bancas de inversión en un entorno privado. Cada oportunidad se
              presenta de forma anónima hasta que el vendedor autoriza el acceso.
            </p>
            <div className="wrap-gap ld-in" style={{ gap: 12, "--i": 3 } as React.CSSProperties}>
              <Link href="/solicitar-acceso" className="btn btn-light btn-lg" data-vault>Solicitar acceso</Link>
              <Link href="/invitacion" className="btn btn-ghost-dark btn-lg" data-vault>Tengo una invitación</Link>
            </div>
          </div>

          <div className="ld-stage-hero ld-in-visual">
            <div className="ld-layer ld-tilt-wrap" style={{ "--d": 0.25 } as React.CSSProperties}>
              <div className="ld-glass ld-hero-card" data-hero-card aria-label="Ejemplo de cómo se ve una oportunidad">
                <ExampleCard />
              </div>
            </div>
            <div className="ld-layer ld-chip ld-chip-a" aria-hidden="true" style={{ "--d": 0.55 } as React.CSSProperties}>
              <Icon name="contract" size={16} /> NDA por oportunidad
            </div>
            <div className="ld-layer ld-chip ld-chip-b" aria-hidden="true" style={{ "--d": 0.8 } as React.CSSProperties}>
              <Icon name="visibility_off" size={16} /> Identidad protegida
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Túnel: el recorrido de una operación, escena por escena (decorativo) ---------- */}
      <section className="ld-tunnel on-dark" data-scrub aria-hidden="true">
        <DealTunnel />
      </section>

      {/* ---------- Cómo funciona: secuencia breve ---------- */}
      <section id="como" className="ld-how" data-how data-step="0">
        <div className="ld-how-sticky">
          <div className="wrap ld-how-grid">
            <div className="ld-how-copy">
              <div className="eyebrow" data-reveal>Cómo funciona</div>
              <h2 className="h2-light" style={{ marginTop: 16 }} data-reveal>Un proceso ordenado, con control en cada etapa.</h2>
              <ol className="ld-steps">
                {HOW.map(([n, t, d], i) => (
                  <li key={n} className="ld-step" data-step-item={i} data-reveal style={{ "--i": i } as React.CSSProperties}>
                    <button type="button" className="ld-step-btn" data-step-go={i} aria-label={`Paso ${n}: ${t}`}>
                      <span className="num ld-step-n">{n}</span>
                      <span>
                        <span className="ld-step-t">{t}</span>
                        <span className="ld-step-d">{d}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* Ilustración del paso activo: las tarjetas se reorganizan en profundidad (decorativa). */}
            <div className="ld-how-stage" aria-hidden="true">
              <div className="ld-scene">
                <div className="ld-sc ld-dark" data-i="0" style={{ "--k": 0 } as React.CSSProperties}>
                  <div className="ld-card-top"><span>SOLICITUD DE ACCESO</span><Icon name="how_to_reg" size={18} /></div>
                  <div className="ld-sc-title">Revisión personal de nuestro equipo</div>
                  <div className="ld-sc-row"><Icon name="mail" size={16} /> Por invitación o solicitud</div>
                  <div className="ld-sc-row"><Icon name="verified_user" size={16} /> Acceso solo para miembros aprobados</div>
                </div>
                <div className="ld-sc ld-dark" data-i="1" style={{ "--k": 1 } as React.CSSProperties}><ExampleCard /></div>
                <div className="ld-sc ld-paper" data-i="2" style={{ "--k": 2 } as React.CSSProperties}>
                  <div className="ld-card-top ld-ink"><span>ACUERDO DE CONFIDENCIALIDAD</span><Icon name="contract" size={18} /></div>
                  <div className="ld-sc-title ld-ink">NDA · RW-1042</div>
                  <div className="ld-lines"><i /><i /><i /><i style={{ width: "62%" }} /></div>
                  <div className="ld-sc-row ld-ink"><Icon name="check_circle" size={16} /> Firmado · acceso pendiente de autorización</div>
                </div>
                <div className="ld-sc ld-dark" data-i="3" style={{ "--k": 3 } as React.CSSProperties}>
                  <div className="ld-card-top"><span>ESPACIO PRIVADO · RW-1042</span><Icon name="key" size={18} /></div>
                  <div className="ld-sc-title">Acceso autorizado por el vendedor</div>
                  <div className="ld-sc-row"><Icon name="description" size={16} /> Estados financieros · lectura</div>
                  <div className="ld-sc-row"><Icon name="description" size={16} /> Memorándum · descarga</div>
                  <div className="ld-sc-row"><Icon name="lock" size={16} /> Contratos · por solicitud</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Confidencialidad: un expediente que se desclasifica paso a paso ---------- */}
      {/* Sin JS, con movimiento reducido o en móvil sin animación: estado final (st-1…st-5). */}
      <section id="confidencialidad" className="ld-conf st-1 st-2 st-3 st-4 st-5" data-conf>
        <div className="ld-conf-sticky">
          <div className="wrap ld-conf-grid">
            <div>
              <div className="eyebrow" data-reveal>Confidencialidad</div>
              <h2 className="h2-light" style={{ margin: "16px 0 20px" }} data-reveal>La identidad de cada empresa se protege por diseño.</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#585858", maxWidth: 440 }} data-reveal>
                Firmar un acuerdo de confidencialidad y obtener acceso son pasos distintos. El vendedor decide, documento por
                documento, qué información comparte y con quién.
              </p>
              <div className="ld-principles">
                {PRINCIPLES.map(([i, t, d], k) => (
                  <div key={t} className="ld-principle" data-reveal data-conf-item={k + 1} style={{ "--i": k } as React.CSSProperties}>
                    <Icon name={i} size={24} />
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>{t}</div>
                      <p style={{ marginTop: 4, fontSize: 15, lineHeight: 1.55, color: "#585858" }}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expediente de ejemplo (decorativo): cada principio destapa una parte; la identidad nunca se muestra. */}
            <div className="ld-file" aria-hidden="true">
              <div className="ld-file-head">
                <span>EXPEDIENTE · RW-1042</span>
                <span className="ld-file-ex">EJEMPLO</span>
              </div>
              <div className="ld-file-stamp">CONFIDENCIAL</div>
              <dl className="ld-file-kv">
                <div><dt>Razón social</dt><dd><span className="rd" data-s="x">Nombre legal de la empresa</span><span className="ld-file-lock"><Icon name="lock" size={14} /> Solo compradores autorizados</span></dd></div>
                <div><dt>Ciudad</dt><dd><span className="rd" data-s="x">Ciudad de la empresa</span></dd></div>
                <div><dt>Sector</dt><dd><span className="rd" data-s="1">Industrial y Manufactura</span></dd></div>
                <div><dt>Región</dt><dd><span className="rd" data-s="1">Bajío</span></dd></div>
                <div><dt>Ventas</dt><dd><span className="rd" data-s="1">US$ 18.4 M</span><span className="ld-file-tag" data-s="1">Visible para miembros</span></dd></div>
                <div><dt>NDA</dt><dd><span className="rd" data-s="2">Firmado por el comprador</span></dd></div>
                <div><dt>Acceso</dt><dd><span className="rd" data-s="3">Autorizado por el vendedor</span></dd></div>
                <div><dt>EBITDA</dt><dd><span className="rd" data-s="3">US$ 3.1 M</span><span className="ld-file-tag" data-s="3">Solo autorizados</span></dd></div>
              </dl>
              <div className="ld-file-docs" data-s="4">
                <div className="ld-file-sub">Documentos</div>
                {[["Estados financieros", "Lectura"], ["Memorándum", "Descarga"], ["Contratos", "Por solicitud"]].map(([d, perm], k) => (
                  <div key={d} className="ld-file-doc" style={{ "--i": k } as React.CSSProperties}>
                    <span><Icon name="description" size={16} /> {d}</span>
                    <span className="ld-file-perm">{perm}</span>
                  </div>
                ))}
              </div>
              <div className="ld-file-log" data-s="5">
                <div className="ld-file-sub">Bitácora</div>
                <div className="ld-file-logline" style={{ "--i": 0 } as React.CSSProperties}><Icon name="history" size={16} /> Consulta registrada · Estados financieros</div>
                <div className="ld-file-logline" style={{ "--i": 1 } as React.CSSProperties}><Icon name="block" size={16} /> El vendedor puede revocar el acceso en cualquier momento</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Cobertura: mapa por regiones ---------- */}
      <section className="on-dark ld-cover">
        <div className="wrap ld-cover-grid">
          <div className="ld-cover-copy">
            <div className="eyebrow" style={{ color: "#AEAEAE" }} data-reveal>Cobertura</div>
            <h2 className="h2-light" style={{ margin: "16px 0 16px" }} data-reveal>Oportunidades en todo México, sin revelar quién es quién.</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#AEAEAE", maxWidth: 440 }} data-reveal>
              Se muestran por región, nunca por empresa. Pase el cursor o toque una región para ver su actividad.
            </p>
          </div>
          <RegionMap stats={stats} />
        </div>
        <p className="wrap ld-cover-note">
          {stats.total >= 3 ? "Oportunidades publicadas en la plataforma. " : ""}Agrupación regional de la plataforma; el mosaico no está a escala.
        </p>
      </section>

      {/* ---------- Para quién ---------- */}
      <section className="wrap" style={{ padding: "clamp(56px, 8vw, 96px) var(--px)" }}>
        <div className="eyebrow" data-reveal>Para quién</div>
        <h2 className="h2-light" style={{ margin: "16px 0 40px", maxWidth: 720 }} data-reveal>Una sola cuenta para comprar, vender o representar a un cliente.</h2>
        <div className="ld-audiences">
          {AUDIENCES.map(([i, t, items], k) => (
            <div key={t} className="card ld-aud" data-reveal data-tilt style={{ padding: 28, "--i": k } as React.CSSProperties}>
              <Icon name={i} size={28} />
              <div style={{ fontSize: 20, fontWeight: 600, margin: "16px 0 12px" }}>{t}</div>
              {items.map((x) => (
                <div key={x} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(26,26,26,.08)", fontSize: 15, color: "#444" }}>
                  <Icon name="check" size={18} />
                  {x}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Cierre: dos persianas (comprador y vendedor) se cierran sobre la llamada a la acción ---------- */}
      <section className="on-dark ld-deal" data-scrub data-deal>
        <div className="ld-deal-sticky">
          <div className="ld-blind ld-blind-l" aria-hidden="true"><span className="ld-blind-label">Comprador</span></div>
          <div className="ld-blind ld-blind-r" aria-hidden="true"><span className="ld-blind-label">Vendedor</span></div>
          <div className="ld-deal-hint" aria-hidden="true">ACCESO POR INVITACIÓN</div>
          <div className="ld-seal" aria-hidden="true"><img src="/brand/rw-isotipo-blanco.png" alt="" /></div>
          <div className="wrap ld-deal-content">
            <div style={{ maxWidth: 640 }}>
              <h2 style={{ fontSize: 32, fontWeight: 300, margin: "0 0 12px", lineHeight: 1.2 }}>El acceso es por invitación o con aprobación de nuestro equipo.</h2>
              <p style={{ color: "#AEAEAE", fontSize: 16 }}>Revisamos cada solicitud para mantener una comunidad de participantes calificados.</p>
            </div>
            <div className="wrap-gap" style={{ gap: 12 }}>
              <Link href="/solicitar-acceso" className="btn btn-light btn-lg" data-vault>Solicitar acceso</Link>
              <Link href="/iniciar-sesion" className="btn btn-ghost-dark btn-lg" data-vault>Iniciar sesión</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="wrap" style={{ padding: "40px var(--px)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        <img src="/brand/redwood-logo.png" alt="Redwood Capital Partners" style={{ height: 48, width: "auto" }} />
        <div className="ld-footer-links" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 20px", fontSize: 13, color: "#585858" }}>
          <span>© {new Date().getFullYear()} Redwood Capital Partners</span>
          <Link href="/legal/privacidad">Aviso de privacidad</Link>
          <Link href="/legal/terminos">Términos de uso</Link>
          <Link href="/estado-solicitud">Estado de mi solicitud</Link>
        </div>
      </footer>
    </div>
  );
}
