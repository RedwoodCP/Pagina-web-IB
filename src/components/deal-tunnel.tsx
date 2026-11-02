import type { CSSProperties, ReactNode } from "react";

/**
 * Túnel de la landing: el recorrido de una operación ilustrado en escenas de línea (SVG) que se
 * atraviesan con el scroll. Cada escena se anima con --lp (0 → 1) mientras se acerca al frente;
 * --lp se deriva en CSS del avance del túnel (--p), sin JavaScript adicional. Ejemplo ilustrativo:
 * no representa una operación real. Decorativo (aria-hidden en la sección).
 */

const Frame = ({ i, label, children }: { i: number; label?: string; children?: ReactNode }) => (
  <div className="ld-frame" style={{ "--i": i } as CSSProperties}>
    {children && (
      <svg className="ld-scene-svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet">
        {children}
      </svg>
    )}
    {label && (
      <span className="ld-frame-label">
        <span className="num">0{i}</span> {label}
      </span>
    )}
  </div>
);

/** Fragmento que aparece entre dos puntos del avance local (--a0 → --a1). */
const w = (a0: number, a1: number) => ({ "--a0": a0, "--a1": a1 }) as CSSProperties;

export function DealTunnel() {
  return (
    <div className="ld-tunnel-sticky">
      <Frame i={0} />

      {/* 01 · La oficina: la oportunidad aparece en pantalla, sin nombre */}
      <Frame i={1} label="La oportunidad, de forma anónima">
        <g className="sc-draw" style={w(0, 0.6)}>
          <rect x="70" y="24" width="500" height="196" pathLength={1} />
          <path d="M195 24v196M320 24v196M445 24v196M70 122h500" pathLength={1} />
          <path d="M70 220v-46h30v-30h26v52h22v-80h34v70h24v-40h30v60h28v-96h36v86h24v-54h30v40h26v-70h32v88h28v-36h30v46h27v-20h29v40" pathLength={1} />
        </g>
        <g className="sc-draw" style={w(0.2, 0.7)}>
          <path d="M40 286h560M110 286v60M530 286v60" pathLength={1} />
          <path d="M226 286h188l-12-12H238z" pathLength={1} />
          <rect x="240" y="164" width="160" height="108" rx="3" className="sc-solid" pathLength={1} />
        </g>
        <g className="sc-fade" style={w(0.55, 0.95)}>
          <rect x="247" y="171" width="146" height="94" className="sc-glow" />
          <text x="258" y="192" className="sc-t sc-strong">RW-1042</text>
          <text x="258" y="206" className="sc-t sc-tiny">INDUSTRIAL · BAJÍO</text>
          <rect x="258" y="218" width="80" height="3" className="sc-bar" />
          <rect x="258" y="227" width="110" height="3" className="sc-bar" />
          <text x="258" y="252" className="sc-t sc-tiny">IDENTIDAD PROTEGIDA</text>
        </g>
      </Frame>

      {/* 02 · Firma del NDA: la pluma traza la firma */}
      <Frame i={2} label="Firma del NDA">
        <g className="sc-draw" style={w(0, 0.4)}>
          <rect x="200" y="16" width="240" height="328" className="sc-paper" pathLength={1} />
        </g>
        <g className="sc-fade" style={w(0.1, 0.45)}>
          <text x="222" y="52" className="sc-t sc-strong">ACUERDO DE CONFIDENCIALIDAD</text>
          <text x="222" y="68" className="sc-t">NDA · RW-1042</text>
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <rect key={k} x="222" y={92 + k * 22} width={k === 6 ? 120 : 196} height="3" className="sc-bar" />
          ))}
          <path d="M226 300h188" className="sc-line" />
          <text x="226" y="318" className="sc-t">FIRMA DEL RECEPTOR</text>
        </g>
        <path
          className="sc-draw sc-sign"
          style={w(0.45, 0.95)}
          pathLength={1}
          d="M236 292c8-26 14-30 16-18s-4 20 2 16 10-24 16-20-2 22 6 18 12-26 18-20-4 20 4 18 14-18 20-14 2 14 10 12 16-14 22-12 6 10 14 8 22-10 34-8"
        />
        <g className="sc-pen" style={w(0.45, 0.95)}>
          <path d="M0 0l-8-30 10-4 8 30z M-8-30l-4-14 10-4 4 14" className="sc-line" />
        </g>
      </Frame>

      {/* 03 · Autorización: se abre el espacio privado */}
      <Frame i={3} label="Autorización del vendedor">
        <g className="sc-draw" style={w(0, 0.4)}>
          <rect x="288" y="150" width="64" height="54" rx="4" pathLength={1} />
          <path d="M320 170v14" pathLength={1} />
        </g>
        <path className="sc-shackle sc-line" style={w(0.35, 0.65)} d="M300 150v-22a20 20 0 0 1 40 0v22" />
        {[0, 1, 2, 3].map((k) => (
          <g key={k} className="sc-rise" style={{ ...w(0.5 + k * 0.1, 0.75 + k * 0.08) }}>
            <path d={`M${110 + k * 112} 300v-52h30l8 8h56v44z`} className="sc-line" />
          </g>
        ))}
        <g className="sc-fade" style={w(0.8, 1)}>
          <text x="320" y="96" textAnchor="middle" className="sc-t sc-strong">ACCESO AUTORIZADO</text>
        </g>
      </Frame>

      {/* 04 · Negociación: oferta y contraoferta convergen */}
      <Frame i={4} label="Negociación">
        <g className="sc-draw" style={w(0, 0.35)}>
          <path d="M90 170h460" pathLength={1} />
          <path d="M90 162v16M205 164v12M320 164v12M435 164v12M550 162v16" pathLength={1} />
          <path d="M40 300h560" pathLength={1} />
        </g>
        <g className="sc-fade" style={w(0.05, 0.35)}>
          <text x="90" y="84" className="sc-t sc-strong">COMPRADOR</text>
          <text x="550" y="84" textAnchor="end" className="sc-t sc-strong">VENDEDOR</text>
        </g>
        <g className="sc-move sc-move-l" style={w(0.25, 0.8)}>
          <path d="M150 112v116" className="sc-line" />
          <text x="150" y="104" textAnchor="middle" className="sc-t">OFERTA</text>
        </g>
        <g className="sc-move sc-move-r" style={w(0.25, 0.8)}>
          <path d="M490 112v116" className="sc-line" />
          <text x="490" y="104" textAnchor="middle" className="sc-t">CONTRAOFERTA</text>
        </g>
        <g className="sc-fade" style={w(0.8, 0.95)}>
          <circle cx="320" cy="170" r="10" className="sc-dot" />
          <text x="320" y="256" textAnchor="middle" className="sc-t sc-strong">TÉRMINOS ACORDADOS</text>
        </g>
        {["PRECIO", "ESTRUCTURA", "PLAZO"].map((t, k) => (
          <g key={t} className="sc-fade" style={w(0.55 + k * 0.12, 0.7 + k * 0.12)}>
            <text x={170 + k * 150} y="326" textAnchor="middle" className="sc-t">✓ {t}</text>
          </g>
        ))}
      </Frame>

      {/* 05 · Cierre: los documentos se juntan y se sella */}
      <Frame i={5} label="Cierre">
        <g className="sc-move sc-move-l2" style={w(0, 0.55)}>
          <rect x="150" y="60" width="150" height="210" className="sc-paper" />
          <path d="M170 100h110M170 120h110M170 140h80M170 240h90" className="sc-line" />
        </g>
        <g className="sc-move sc-move-r2" style={w(0, 0.55)}>
          <rect x="340" y="80" width="150" height="210" className="sc-paper" />
          <path d="M360 120h110M360 140h110M360 160h80M360 260h90" className="sc-line" />
        </g>
        <g className="sc-stamp" style={w(0.6, 0.85)}>
          <circle cx="320" cy="180" r="56" className="sc-seal" />
          <circle cx="320" cy="180" r="48" className="sc-line" />
          <text x="320" y="185" textAnchor="middle" className="sc-t sc-strong sc-big">CERRADO</text>
        </g>
      </Frame>

      <div className="ld-frame ld-frame-end" style={{ "--i": 6 } as CSSProperties}>
        <img src="/brand/rw-isotipo-blanco.png" alt="" />
        <span>RED PRIVADA DE TRANSACCIONES</span>
      </div>
      <div className="ld-tunnel-note">Ejemplo ilustrativo</div>
    </div>
  );
}
