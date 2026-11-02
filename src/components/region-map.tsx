import type { CSSProperties } from "react";
import { REGIONS } from "@/lib/domain";

/**
 * Mapa de mosaicos de México (un mosaico por estado) agrupado en las regiones de la plataforma.
 * Muestra datos agregados de oportunidades publicadas, nunca de una empresa:
 * los números solo aparecen con al menos MIN_TOTAL oportunidades y los sectores de una región
 * solo con al menos MIN_REGION en esa región, para que nadie pueda deducir de qué empresa se trata.
 */
const MIN_TOTAL = 3;
const MIN_REGION = 2;

// [abreviatura, columna, fila, región]. Posiciones aproximadas: es un mosaico, no un mapa a escala.
const STATES: [string, number, number, (typeof REGIONS)[number]][] = [
  ["BC", 0, 0, "Noroeste"], ["SON", 1, 0, "Noroeste"], ["CHH", 2, 0, "Noroeste"], ["COA", 3, 0, "Noreste"], ["NL", 4, 0, "Noreste"],
  ["BCS", 0, 1, "Noroeste"], ["SIN", 1, 1, "Noroeste"], ["DUR", 2, 1, "Noroeste"], ["ZAC", 3, 1, "Bajío"], ["SLP", 4, 1, "Bajío"], ["TAM", 5, 1, "Noreste"],
  ["NAY", 1, 2, "Occidente"], ["JAL", 2, 2, "Occidente"], ["AGS", 3, 2, "Bajío"], ["GTO", 4, 2, "Bajío"], ["QRO", 5, 2, "Bajío"], ["VER", 6, 2, "Sureste"], ["YUC", 9, 2, "Sureste"],
  ["COL", 2, 3, "Occidente"], ["MIC", 3, 3, "Occidente"], ["MEX", 4, 3, "Centro"], ["HGO", 5, 3, "Centro"], ["PUE", 6, 3, "Centro"], ["TAB", 7, 3, "Sureste"], ["CAM", 8, 3, "Sureste"], ["QR", 9, 3, "Sureste"],
  ["GRO", 3, 4, "Sureste"], ["CDMX", 4, 4, "Centro"], ["MOR", 5, 4, "Centro"], ["TLX", 6, 4, "Centro"], ["CHP", 7, 4, "Sureste"],
  ["OAX", 6, 5, "Sureste"],
];

export type RegionStats = { total: number; byRegion: Record<string, { n: number; sectors: string[] }> };

export function RegionMap({ stats }: { stats: RegionStats }) {
  const showNumbers = stats.total >= MIN_TOTAL;
  const max = Math.max(1, ...REGIONS.map((r) => stats.byRegion[r]?.n ?? 0));
  return (
    <div className="ld-map">
      <div className="ld-map-stage" aria-hidden="true">
        <div className="ld-map-plane" data-reveal>
          {STATES.map(([abbr, c, r, region]) => {
            const k = REGIONS.indexOf(region);
            const n = stats.byRegion[region]?.n ?? 0;
            const level = showNumbers ? (n ? 0.35 + (n / max) * 0.65 : 0.12) : 0.45;
            return (
              <div key={abbr} className="ld-tile" data-r={k} style={{ gridColumn: c + 1, gridRow: r + 1, "--lv": level, "--d": c + r } as CSSProperties}>
                {abbr}
              </div>
            );
          })}
        </div>
      </div>
      <ul className="ld-regions">
        {REGIONS.map((region, k) => {
          const s = stats.byRegion[region];
          const n = s?.n ?? 0;
          return (
            <li key={region}>
              <button type="button" className="ld-reg" data-r={k}>
                <span className="ld-reg-name">{region}</span>
                {showNumbers && (
                  <span className="ld-reg-n">
                    {n === 0 ? "Sin oportunidades por ahora" : `${n} ${n === 1 ? "oportunidad" : "oportunidades"}`}
                  </span>
                )}
                {showNumbers && n >= MIN_REGION && s!.sectors.length > 0 && <span className="ld-reg-s">{s!.sectors.slice(0, 2).join(" · ")}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Agrega las oportunidades publicadas por región (y sus sectores más frecuentes). */
export function regionStats(rows: { region: string | null; sector: string | null }[]): RegionStats {
  const byRegion: RegionStats["byRegion"] = {};
  const sectorCount: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!r.region) continue;
    byRegion[r.region] ??= { n: 0, sectors: [] };
    byRegion[r.region]!.n++;
    if (r.sector) {
      sectorCount[r.region] ??= {};
      sectorCount[r.region]![r.sector] = (sectorCount[r.region]![r.sector] ?? 0) + 1;
    }
  }
  for (const [region, counts] of Object.entries(sectorCount))
    byRegion[region]!.sectors = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  return { total: rows.filter((r) => r.region).length, byRegion };
}
