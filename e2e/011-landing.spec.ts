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
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole("link", { name: "Solicitar acceso" }).last()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("movimiento reducido: todo visible, sin sección fija", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length);
    expect(hidden).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ld-how-sticky")!).position)).not.toBe("sticky");
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
