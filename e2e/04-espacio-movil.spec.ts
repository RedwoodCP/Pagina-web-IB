import { expect, test } from "@playwright/test";
import { U, login } from "./helpers";

test.describe("Espacio de operación", () => {
  test("preguntas, reunión, interés y documento restringido entre comprador y vendedor", async ({ page, browser }) => {
    await login(page, U.mariana);
    await page.goto("/oportunidades/RW-1187/espacio?tab=preguntas");
    await page.getByRole("button", { name: "Enviar pregunta" }).click();
    await expect(page.getByText("Escriba una pregunta de al menos 10 caracteres.")).toBeVisible();
    await page.getByLabel(/^Pregunta/).fill("¿Cuál es la antigüedad promedio de la flotilla?");
    await page.getByRole("button", { name: "Enviar pregunta" }).click();
    await expect(page.getByText("Pregunta enviada al vendedor.")).toBeVisible();
    await expect(page.getByLabel(/^Pregunta/)).toHaveValue("");

    await page.goto("/oportunidades/RW-1187/espacio?tab=reunion");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("Proponga al menos un horario.")).toBeVisible();
    const d = new Date(Date.now() + 5 * 86400_000);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T10:00`;
    await page.getByLabel("Horario propuesto 1").fill(local);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText(/Solicitud de reunión enviada/)).toBeVisible();

    await page.goto("/oportunidades/RW-1187/espacio");
    await page.getByRole("button", { name: "Muy interesado" }).click();
    await expect(page.getByText("Interés actualizado: Muy interesado.")).toBeVisible();

    await page.goto("/oportunidades/RW-1187/espacio?tab=documentos&cat=Legal");
    await page.locator(".row", { hasText: "Contratos con proveedores" }).getByRole("button", { name: "Solicitar acceso" }).click();
    await expect(page.locator(".row", { hasText: "Contratos con proveedores" }).getByText("Acceso solicitado")).toBeVisible();

    // El asesor del vendedor responde, confirma y comparte
    const c = await browser.newContext();
    const s = await c.newPage();
    await login(s, U.javier);
    await s.goto("/venta");
    await s.getByRole("link", { name: "Gestionar interesados" }).first().click();
    await expect(s.getByText("Interés: Muy interesado")).toBeVisible();
    await expect(s).toHaveURL(/\/venta\/c/);
    const base = s.url().split("?")[0];
    await s.goto(base + "?tab=preguntas");
    const q = s.locator("form").filter({ has: s.getByRole("button", { name: "Responder" }) }).first();
    await q.getByLabel("Respuesta").fill("Cuatro años en promedio.");
    await q.getByRole("button", { name: "Responder" }).click();
    await expect(s.getByText("Respuesta enviada.")).toBeVisible();
    await s.goto(base + "?tab=reuniones");
    await s.getByLabel("Horario a confirmar").selectOption({ index: 1 });
    await s.getByRole("button", { name: "Confirmar horario" }).click();
    await expect(s.getByText("Reunión confirmada.")).toBeVisible();
    await s.goto(base + "?tab=documentos");
    await s.locator(".row", { hasText: "Contratos con proveedores" }).getByRole("button", { name: "Compartir (solo lectura)" }).click();
    await expect(s.getByText("Documento compartido en modo lectura.")).toBeVisible();
    await c.close();

    await page.goto("/oportunidades/RW-1187/espacio?tab=preguntas");
    await expect(page.getByText("Cuatro años en promedio.")).toBeVisible();
    await page.goto("/oportunidades/RW-1187/espacio?tab=reunion");
    await expect(page.getByText(/Confirmada:/)).toBeVisible();
    await page.goto("/oportunidades/RW-1187/espacio?tab=documentos&cat=Legal");
    const row = page.locator(".row", { hasText: "Contratos con proveedores" });
    await expect(row.getByRole("link", { name: "Ver" })).toBeVisible();
    await expect(row.getByRole("link", { name: "Descargar" })).toHaveCount(0);
  });
});

test.describe("Celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("navegación inferior, filtros plegables y detalle utilizables en 390 px", async ({ page }) => {
    await login(page, U.pablo);
    await page.goto("/oportunidades");
    await expect(page.locator(".sidebar")).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Navegación móvil" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(page.getByRole("button", { name: /^Industria/ })).toBeHidden();
    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByRole("button", { name: /^Industria/ }).click();
    await page.getByRole("menuitemcheckbox", { name: "Logística" }).click();
    await expect(page).toHaveURL(/sector=Log/);
    await expect(page.getByRole("button", { name: /^Filtros · 1/ })).toBeVisible();
    // sin desplazamiento horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.goto("/oportunidades/RW-1042");
    const o2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(o2).toBeLessThanOrEqual(1);
    await nav.getByRole("link", { name: "Panel" }).click();
    await expect(page).toHaveURL(/\/panel/);
  });
});
