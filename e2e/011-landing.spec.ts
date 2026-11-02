import { expect, test } from "@playwright/test";

test.describe("Landing pública", () => {
  test("movimiento: secuencia de pasos con teclado, sin errores ni desbordamiento", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // La secuencia de «Cómo funciona» responde a los pasos (clic o teclado)
    await page.locator('[data-step-go="2"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-how]")).toHaveAttribute("data-step", "2");
    // Las acciones siguen disponibles
    // Túnel: el avance del scroll llega a la sección; cierre: las persianas se cierran y aparece la llamada
    await page.evaluate(() => { const t = document.querySelector<HTMLElement>(".ld-tunnel")!; scrollTo(0, t.offsetTop + t.offsetHeight / 2); });
    await expect.poll(() => page.evaluate(() => Number(document.querySelector<HTMLElement>(".ld-tunnel")!.style.getPropertyValue("--p")))).toBeGreaterThan(0.2);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("[data-deal]")).toHaveClass(/is-closed/);
    await expect(page.getByRole("link", { name: "Solicitar acceso" }).last()).toBeVisible();
    await page.getByRole("link", { name: "Solicitar acceso" }).last().click();
    await expect(page).toHaveURL(/solicitar-acceso/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("expediente, mapa por regiones y transición de bóveda", async ({ page }) => {
    await page.goto("/");
    // Expediente: al inicio de la sección todo tachado; al final, destapado salvo la identidad
    const conf = page.locator("[data-conf]");
    await page.evaluate(() => scrollTo(0, document.querySelector<HTMLElement>("[data-conf]")!.offsetTop + 5));
    await expect(conf).not.toHaveClass(/st-1/);
    await page.evaluate(() => { const c = document.querySelector<HTMLElement>("[data-conf]")!; scrollTo(0, c.offsetTop + c.offsetHeight - innerHeight - 5); });
    await expect(conf).toHaveClass(/st-5/);
    // El nombre real nunca está en la página: solo un texto genérico bajo la barra
    expect(await page.content()).not.toContain("Empaques Altiplano");
    // Mapa: datos agregados por región, resaltado al pasar el cursor
    await page.locator(".ld-cover").scrollIntoViewIfNeeded();
    await expect(page.locator(".ld-reg", { hasText: "Bajío" })).toContainText("oportunidades");
    await page.locator('.ld-reg[data-r="2"]').hover();
    await expect(page.locator('.ld-tile[data-r="2"]').first()).toHaveCSS("border-color", /rgba\(255, 255, 255, 0\.64\)|rgb\(255, 255, 255\)/);
    // Bóveda: las puertas se cierran, se navega y se abren en el destino sin quedar encima
    await page.evaluate(() => scrollTo(0, 0));
    await page.getByRole("link", { name: "Tengo una invitación" }).click();
    await expect(page.locator(".vault")).toHaveCount(1);
    await expect(page).toHaveURL(/\/invitacion/);
    await expect(page.locator(".vault")).toHaveCount(0, { timeout: 5000 });
  });

  test("movimiento reducido: todo visible, sin sección fija", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length);
    expect(hidden).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ld-how-sticky")!).position)).not.toBe("sticky");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ld-tunnel-sticky")!).position)).not.toBe("sticky");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ld-conf-sticky")!).position)).not.toBe("sticky");
    await expect(page.locator("[data-conf]")).toHaveClass(/st-5/);
    await expect(page.getByRole("link", { name: "Solicitar acceso" }).last()).toBeVisible();
    // Sin bóveda: navegación directa
    await page.getByRole("link", { name: "Tengo una invitación" }).click();
    await expect(page).toHaveURL(/\/invitacion/);
    await expect(page.locator(".vault")).toHaveCount(0);
    await ctx.close();
  });

  test("móvil: sin efectos de cursor, sin desbordamiento y enlaces funcionales", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(page.locator(".ld-how-stage")).toBeHidden();
    await page.getByRole("link", { name: "Solicitar acceso" }).first().click();
    await expect(page).toHaveURL(/solicitar-acceso/);
    await ctx.close();
  });
});
