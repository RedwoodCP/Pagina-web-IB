import { expect, test } from "@playwright/test";
import { U, confirmDialog, login } from "./helpers";

test.describe("Búsquedas de compra (administración)", () => {
  test("registrar con criterios obligatorios, cruzar con oportunidades y editar", async ({ page }) => {
    await login(page, U.admin);
    await page.goto("/admin/busquedas");
    await page.getByRole("link", { name: "Nueva búsqueda" }).click();

    // Obligatorios: sin ellos no se registra
    await page.getByRole("button", { name: "Registrar búsqueda" }).click();
    await expect(page.getByText("Indique ventas mínimas, máximas o ambas.")).toBeVisible();
    await expect(page.getByText("Indique margen mínimo, máximo o ambos.")).toBeVisible();
    await expect(page.getByText("Seleccione al menos una región.")).toBeVisible();
    await expect(page.getByText("Seleccione al menos una industria.")).toBeVisible();

    await page.getByRole("textbox", { name: /^Cliente o comprador/ }).fill("Fondo Industrial Prueba");
    await page.getByLabel("Mínimo").first().fill("10");
    await page.getByLabel("Máximo").first().fill("25");
    await page.getByLabel("Mínimo").nth(1).fill("15");
    await page.locator("label.chip", { hasText: "Bajío" }).click();
    await page.locator("label.chip", { hasText: "Industrial y Manufactura" }).click();
    await page.locator("label.chip", { hasText: "Inmobiliario" }).click();
    // Opcionales
    await page.getByLabel(/Deuda \/ EBITDA máxima/).fill("2");
    await page.getByLabel(/Concentración máxima/).fill("20");
    await page.getByRole("button", { name: "Registrar búsqueda" }).click();

    await expect(page).toHaveURL(/\/admin\/busquedas\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Fondo Industrial Prueba" })).toBeVisible();
    // RW-1042 (Industrial, Bajío, US$ 18.4 M, 16.8%) coincide y cumple ambos opcionales
    await expect(page.getByText("Oportunidades que coinciden · 1")).toBeVisible();
    const row = page.locator(".row", { hasText: "RW-1042" }).first();
    await expect(row.getByText("2/2 opcionales")).toBeVisible();
    // RW-1611 (Inmobiliario, Bajío) está en MXN: no se compara con USD
    await expect(page.getByText("Casi coinciden")).toBeVisible();
    await expect(page.locator(".row", { hasText: "RW-1611" }).getByText(/Cifras en MXN/)).toBeVisible();

    // Editar: margen mínimo más alto deja de coincidir
    await page.getByLabel("Mínimo").nth(1).fill("20");
    await page.getByRole("button", { name: "Guardar criterios" }).click();
    await expect(page.getByText("Criterios actualizados.")).toBeVisible();
    await expect(page.getByText("Oportunidades que coinciden · 0")).toBeVisible();

    await page.getByRole("button", { name: "Pausar" }).click();
    await expect(page.getByText(/quedó en pausa/)).toBeVisible();
    await page.getByRole("button", { name: "Eliminar" }).click();
    await confirmDialog(page, "Eliminar");
    await expect(page).toHaveURL(/\/admin\/busquedas$/);
  });

  test("solo administración puede verlas", async ({ page }) => {
    await login(page, U.mariana);
    const r = await page.goto("/admin/busquedas");
    expect(r!.url()).not.toContain("/admin/busquedas");
  });
});
