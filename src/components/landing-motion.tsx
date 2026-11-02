"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { VAULT_FLAG } from "./vault";

/**
 * Movimiento de la landing pública (mejora progresiva: sin JS, todo el contenido es visible y funcional).
 * - Revela por scroll los elementos [data-reveal] (IntersectionObserver).
 * - Navegación: cambia de estilo al desplazarse.
 * - Primera pantalla: capas con desplazamiento según el cursor e inclinación moderada de la tarjeta (solo puntero fino).
 * - «Cómo funciona»: el paso activo sigue al scroll dentro de una sección fija (solo escritorio).
 * - Confidencialidad [data-conf]: un expediente se destapa por etapas, una por principio.
 * - Túnel y cierre [data-scrub]: el avance del scroll dentro de la sección fija se expone como --p.
 * - Tarjetas [data-tilt]: inclinación ligera al pasar el cursor.
 * - Enlaces [data-vault]: transición «bóveda» (las puertas se cierran y se abren en la página de destino).
 * Con prefers-reduced-motion no se activa ningún efecto dependiente del movimiento.
 */
export function LandingMotion() {
  const router = useRouter();
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
    const scrubs = Array.from(root.querySelectorAll<HTMLElement>("[data-scrub]"));
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
        // Secciones fijas que avanzan con el scroll (túnel y cierre): --p de 0 a 1.
        if (!reduce)
          for (const el of scrubs) {
            const r = el.getBoundingClientRect();
            if (r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
            const p = Math.min(1, Math.max(0, -r.top / Math.max(1, el.offsetHeight - innerHeight)));
            el.style.setProperty("--p", p.toFixed(4));
            if (el.hasAttribute("data-deal")) el.classList.toggle("is-closed", p > 0.6);
          }
        if (conf && pinned()) {
          const r = conf.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, conf.offsetHeight - innerHeight)));
          setConf(Math.min(5, Math.floor(p * 6)));
        }
        if (how && pinned()) {
          const r = how.getBoundingClientRect();
          const span = how.offsetHeight - innerHeight;
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
          setStep(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)));
        }
      });
    };
    steps[0]?.toggleAttribute("data-active", true);

    // --- Confidencialidad: etapas acumulativas del expediente (st-1…st-5)
    const conf = root.querySelector<HTMLElement>("[data-conf]");
    const confItems = conf ? Array.from(conf.querySelectorAll<HTMLElement>("[data-conf-item]")) : [];
    let confStage = 5;
    const setConf = (n: number) => {
      if (!conf || n === confStage) return;
      confStage = n;
      for (let k = 1; k <= 5; k++) conf.classList.toggle(`st-${k}`, k <= n);
      confItems.forEach((el) => el.toggleAttribute("data-active", Number(el.dataset.confItem) === n));
    };
    // Móvil (sin sección fija): al entrar en pantalla se destapa por etapas, una sola vez.
    if (conf && !reduce && !pinned() && "IntersectionObserver" in window) {
      setConf(0);
      const io2 = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io2.disconnect();
        let n = 0;
        const t = setInterval(() => (++n > 5 ? clearInterval(t) : setConf(n)), 450);
        cleanups.push(() => clearInterval(t));
      }, { threshold: 0.35 });
      io2.observe(conf.querySelector(".ld-file") ?? conf);
      cleanups.push(() => io2.disconnect());
    }
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

    // --- Bóveda: solo clic principal sin teclas modificadoras; con movimiento reducido, navegación normal.
    if (!reduce) {
      const onVault = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-vault]");
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        const href = a.getAttribute("href")!;
        const v = document.createElement("div");
        v.className = "vault is-closing";
        v.setAttribute("aria-hidden", "true");
        v.innerHTML = '<div class="vault-door vault-l"></div><div class="vault-door vault-r"></div><div class="vault-seal"><img src="/brand/rw-isotipo-blanco.png" alt=""></div>';
        document.body.appendChild(v);
        requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add("is-shut")));
        setTimeout(() => {
          try {
            sessionStorage.setItem(VAULT_FLAG, "1");
          } catch {}
          router.push(href);
        }, 720);
        // Respaldo: si la navegación no ocurre, no dejar la pantalla cubierta.
        setTimeout(() => v.remove(), 4000);
      };
      root.addEventListener("click", onVault, true);
      cleanups.push(() => {
        root.removeEventListener("click", onVault, true);
        document.querySelectorAll(".vault.is-closing").forEach((n) => n.remove());
      });
    }

    return () => cleanups.forEach((f) => f());
  }, [router]);
  return null;
}
