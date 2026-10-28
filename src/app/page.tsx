import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

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

export default async function Landing() {
  const user = await getCurrentUser();
  const home = user ? (user.isAdmin ? "/admin/solicitudes" : user.canBuy ? "/panel" : "/venta") : null;
  return (
    <div>
      <section className="hero on-dark">
        <div className="wrap">
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "28px 0" }}>
            <Brand dark />
            <nav aria-label="Acceso" style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div className="desktop-only" style={{ display: "flex", gap: 24, fontSize: 14 }}>
                <a href="#como" style={{ color: "#fff", textDecoration: "none" }}>Cómo funciona</a>
                <a href="#confidencialidad" style={{ color: "#fff", textDecoration: "none" }}>Confidencialidad</a>
              </div>
              <Link href={home ?? "/iniciar-sesion"} className="btn btn-ghost-dark" style={{ height: 40, fontSize: 14, padding: "0 16px" }}>
                {home ? "Ir a la plataforma" : "Iniciar sesión"}
              </Link>
            </nav>
          </header>
          <div style={{ padding: "clamp(48px, 9vw, 120px) 0 clamp(56px, 8vw, 96px)", display: "flex", flexWrap: "wrap", gap: 56, alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 560px", minWidth: 0 }}>
              <div style={{ fontSize: 12, letterSpacing: ".18em", fontWeight: 600, color: "#F0F0F0" }}>
                RED PRIVADA DE TRANSACCIONES · ACCESO POR INVITACIÓN
              </div>
              <h1 className="display" style={{ margin: "20px 0 24px" }}>
                Compra y venta de empresas, con la discreción que exige cada operación.
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: "#F0F0F0", maxWidth: 580, margin: "0 0 36px" }}>
                Conectamos a empresarios, fondos de inversión y bancas de inversión en un entorno privado. Cada oportunidad se
                presenta de forma anónima hasta que el vendedor autoriza el acceso.
              </p>
              <div className="wrap-gap" style={{ gap: 12 }}>
                <Link href="/solicitar-acceso" className="btn btn-light btn-lg">Solicitar acceso</Link>
                <Link href="/invitacion" className="btn btn-ghost-dark btn-lg">Tengo una invitación</Link>
              </div>
            </div>
            <div
              style={{ flex: "0 1 380px", minWidth: 260, background: "rgba(26,26,26,.6)", border: "1px solid rgba(255,255,255,.18)", padding: 24, backdropFilter: "blur(10px)" }}
              aria-label="Ejemplo de cómo se ve una oportunidad"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, letterSpacing: ".16em", color: "#AEAEAE", fontWeight: 600 }}>
                <span>ASÍ SE VE UNA OPORTUNIDAD</span>
                <span>EJEMPLO</span>
              </div>
              <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700, letterSpacing: ".06em" }}>
                RW-1042 <span style={{ fontWeight: 400, color: "#AEAEAE", letterSpacing: ".12em" }}>· INDUSTRIAL Y MANUFACTURA</span>
              </div>
              <div style={{ fontSize: 20, lineHeight: 1.3, margin: "8px 0 20px" }}>Fabricante de empaques flexibles para consumo masivo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: "1px solid rgba(255,255,255,.18)", paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#AEAEAE" }}>VENTAS</div>
                  <div className="num" style={{ fontSize: 20 }}>US$ 18.4 M</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#AEAEAE" }}>MARGEN EBITDA</div>
                  <div className="num" style={{ fontSize: 20 }}>16.8%</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, fontSize: 13, color: "#F0F0F0" }}>
                <Icon name="lock" size={18} />
                Nombre e identidad protegidos hasta autorización
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como" className="wrap" style={{ padding: "clamp(56px, 8vw, 96px) var(--px)", display: "flex", flexWrap: "wrap", gap: 48 }}>
        <div style={{ flex: "1 1 300px" }}>
          <div className="eyebrow">Cómo funciona</div>
          <h2 className="h2-light" style={{ marginTop: 16 }}>Un proceso ordenado, con control en cada etapa.</h2>
        </div>
        <div style={{ flex: "2 1 600px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 32 }}>
          {HOW.map(([n, t, d]) => (
            <div key={n} style={{ borderTop: "1px solid #1A1A1A", paddingTop: 20 }}>
              <div className="num" style={{ fontSize: 40, fontWeight: 300, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 18, fontWeight: 600, margin: "20px 0 8px" }}>{t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "#585858" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="confidencialidad" style={{ background: "#fff", borderTop: "1px solid rgba(26,26,26,.08)", borderBottom: "1px solid rgba(26,26,26,.08)" }}>
        <div className="wrap" style={{ padding: "clamp(56px, 8vw, 96px) var(--px)", display: "flex", flexWrap: "wrap", gap: 48 }}>
          <div style={{ flex: "1 1 300px" }}>
            <div className="eyebrow">Confidencialidad</div>
            <h2 className="h2-light" style={{ margin: "16px 0 20px" }}>La identidad de cada empresa se protege por diseño.</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#585858", maxWidth: 440 }}>
              Firmar un acuerdo de confidencialidad y obtener acceso son pasos distintos. El vendedor decide, documento por
              documento, qué información comparte y con quién.
            </p>
          </div>
          <div style={{ flex: "2 1 600px" }}>
            {PRINCIPLES.map(([i, t, d]) => (
              <div key={t} style={{ display: "flex", gap: 20, padding: "22px 0", borderBottom: "1px solid rgba(26,26,26,.1)" }}>
                <Icon name={i} size={24} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{t}</div>
                  <p style={{ marginTop: 4, fontSize: 15, lineHeight: 1.55, color: "#585858" }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap" style={{ padding: "clamp(56px, 8vw, 96px) var(--px)" }}>
        <div className="eyebrow">Para quién</div>
        <h2 className="h2-light" style={{ margin: "16px 0 40px", maxWidth: 720 }}>Una sola cuenta para comprar, vender o representar a un cliente.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {AUDIENCES.map(([i, t, items]) => (
            <div key={t} className="card" style={{ padding: 28 }}>
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

      <section style={{ background: "#1A1A1A", color: "#fff" }} className="on-dark">
        <div className="wrap" style={{ padding: "72px var(--px)", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontSize: 32, fontWeight: 300, margin: "0 0 12px", lineHeight: 1.2 }}>El acceso es por invitación o con aprobación de nuestro equipo.</h2>
            <p style={{ color: "#AEAEAE", fontSize: 16 }}>Revisamos cada solicitud para mantener una comunidad de participantes calificados.</p>
          </div>
          <div className="wrap-gap" style={{ gap: 12 }}>
            <Link href="/solicitar-acceso" className="btn btn-light btn-lg">Solicitar acceso</Link>
            <Link href="/iniciar-sesion" className="btn btn-ghost-dark btn-lg">Iniciar sesión</Link>
          </div>
        </div>
      </section>

      <footer className="wrap" style={{ padding: "40px var(--px)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        <img src="/brand/redwood-logo.png" alt="Redwood Capital Partners" style={{ height: 48, width: "auto" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13, color: "#585858" }}>
          <span>© {new Date().getFullYear()} Redwood Capital Partners</span>
          <Link href="/legal/privacidad">Aviso de privacidad</Link>
          <Link href="/legal/terminos">Términos de uso</Link>
          <Link href="/estado-solicitud">Estado de mi solicitud</Link>
        </div>
      </footer>
    </div>
  );
}
