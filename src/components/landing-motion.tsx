"use client";

import { useEffect } from "react";

/**
 * Movimiento de la landing pública (mejora progresiva: sin JS, todo el contenido es visible y funcional).
 * - Revela por scroll los elementos [data-reveal] (IntersectionObserver).
 * - Navegación: cambia de estilo al desplazarse.
 * - Primera pantalla: capas con desplazamiento según el cursor e inclinación moderada de la tarjeta (solo puntero fino).
 * - «Cómo funciona»: el paso activo sigue al scroll dentro de una sección fija (solo escritorio).
 * - Tarjetas [data-tilt]: inclinación ligera al pasar el cursor.
 * Con prefers-reduced-motion no se activa ningún efecto dependiente del movimiento.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ld");
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: (() => void)[] = [];
    root.classList.add("ld-js");
    if (reduce) root.classList.add("ld-reduce");

    // --- Revelado por scroll
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      items.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // --- Navegación y secuencia de pasos (un solo manejador de scroll, agrupado por frame)
    const nav = root.querySelector<HTMLElement>("[data-nav]");
    const how = root.querySelector<HTMLElement>("[data-how]");
    const steps = how ? Array.from(how.querySelectorAll<HTMLElement>("[data-step-item]")) : [];
    const cards = how ? Array.from(how.querySelectorAll<HTMLElement>(".ld-sc")) : [];
    const pinned = () => !reduce && matchMedia("(min-width: 1000px)").matches;
    let ticking = false;
    const setStep = (n: number) => {
      if (!how || how.dataset.step === String(n)) return;
      how.dataset.step = String(n);
      steps.forEach((s, i) => s.toggleAttribute("data-active", i === n));
      cards.forEach((c) => c.style.setProperty("--k", String(Number(c.dataset.i) - n)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        nav?.classList.toggle("is-scrolled", scrollY > 24);
        if (how && pinned()) {
          const r = how.getBoundingClientRect();
          const span = how.offsetHeight - innerHeight;
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
          setStep(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)));
        }
      });
    };
    steps[0]?.toggleAttribute("data-active", true);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    });

    // Los pasos también se activan con clic o teclado (y llevan el scroll a su posición si la sección está fija).
    const onStep = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-step-go]");
      if (!btn || !how) return;
      const n = Number(btn.dataset.stepGo);
      if (pinned()) {
        const span = how.offsetHeight - innerHeight;
        const top = how.getBoundingClientRect().top + scrollY + (span * (n + 0.5)) / steps.length;
        scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      }
      setStep(n);
    };
    how?.addEventListener("click", onStep);
    cleanups.push(() => how?.removeEventListener("click", onStep));

    // --- Cursor: capas de la primera pantalla y tarjetas con inclinación (solo puntero fino, sin movimiento reducido)
    if (finePointer && !reduce) {
      const hero = root.querySelector<HTMLElement>("[data-hero]");
      if (hero) {
        let tx = 0, ty = 0, x = 0, y = 0, raf = 0, active = false;
        const loop = () => {
          x += (tx - x) * 0.08;
          y += (ty - y) * 0.08;
          hero.style.setProperty("--mx", x.toFixed(4));
          hero.style.setProperty("--my", y.toFixed(4));
          // Se detiene al llegar al reposo: sin animación continua innecesaria.
          if (Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005) raf = requestAnimationFrame(loop);
          else active = false;
        };
        const kick = () => {
          if (!active) {
            active = true;
            raf = requestAnimationFrame(loop);
          }
        };
        const onMove = (e: PointerEvent) => {
          const r = hero.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
          kick();
        };
        const onLeave = () => {
          tx = 0;
          ty = 0;
          kick();
        };
        hero.addEventListener("pointermove", onMove);
        hero.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          cancelAnimationFrame(raf);
          hero.removeEventListener("pointermove", onMove);
          hero.removeEventListener("pointerleave", onLeave);
        });
      }

      root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
        const onMove = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--tx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
          card.style.setProperty("--ty", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
        };
        const onLeave = () => {
          card.style.setProperty("--tx", "0");
          card.style.setProperty("--ty", "0");
        };
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          card.removeEventListener("pointermove", onMove);
          card.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    return () => cleanups.forEach((f) => f());
  }, []);
  return null;
}
