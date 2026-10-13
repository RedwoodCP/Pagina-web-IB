// Detección simple de datos identificables en textos que verán compradores sin autorización.
// No sustituye la revisión del equipo: es una primera barrera automática.

const GENERIC = new Set([
  "s.a.", "sa", "de", "c.v.", "cv", "del", "la", "las", "los", "el", "y", "s.c.", "sc", "s.a.p.i.", "sapi", "a.c.", "ac",
  "grupo", "empresa", "empresas", "servicios", "industrial", "industriales", "s.p.r.", "spr", "r.l.", "rl", "s.", "de r.l.",
  "méxico", "mexico", "bajío", "bajio", "noreste", "noroeste", "occidente", "sureste", "norte", "sur", "centro", "comercial", "distribuidora", "internacional", "nacional",
]);

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function identityLeaks(legalName: string | null | undefined, texts: (string | null | undefined)[]): { field: number; word: string } | null {
  if (!legalName) return null;
  const words = legalName
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3 && !GENERIC.has(w.toLowerCase()));
  // Se considera fuga una palabra distintiva de la razón social usada como nombre propio
  // (con mayúscula y no al inicio de una oración), p. ej. «empaques» es genérico, «Altiplano» no.
  for (let i = 0; i < texts.length; i++) {
    const raw = texts[i] ?? "";
    for (const w of words) {
      const nw = norm(w).replace(/[^a-z0-9ñ]/g, "");
      if (nw.length <= 3) continue;
      const re = new RegExp(`(^|[^\\p{L}])(${escape(w.replace(/[.,]/g, ""))})(?=$|[^\\p{L}])`, "giu");
      for (const m of raw.matchAll(re)) {
        const idx = (m.index ?? 0) + m[1]!.length;
        const word = m[2]!;
        const before = raw.slice(0, idx).trimEnd();
        const sentenceStart = before === "" || /[.!?:\n]$/.test(before);
        if (word[0] === word[0]!.toUpperCase() && word[0] !== word[0]!.toLowerCase() && !sentenceStart) return { field: Math.min(i, 2), word: w };
      }
    }
  }
  return null;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
