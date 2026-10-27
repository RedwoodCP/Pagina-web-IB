import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { U, login } from "./helpers";

const TMP = path.join(__dirname, "..", "test-results", "files");
mkdirSync(TMP, { recursive: true });
const signedPdf = path.join(TMP, "nda-firmado.pdf");
writeFileSync(signedPdf, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

test("comprador sube el NDA firmado; solo lo ven él, el vendedor y administración", async ({ page, browser }) => {
  await login(page, U.pablo);
  await page.goto("/oportunidades/RW-1452");
  await page.getByRole("button", { name: "Solicitar información" }).last().click();
  await expect(page).toHaveURL(/RW-1452\/nda/);
  await page.getByLabel("He leído el acuerdo completo").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("label.chip", { hasText: "Subir el NDA firmado" }).click();
  await page.getByRole("button", { name: "Enviar NDA firmado" }).click();
  await expect(page.getByText("Adjunte el NDA firmado (PDF, JPG o PNG).")).toBeVisible();
  await page.getByLabel(/^NDA firmado/).setInputFiles(signedPdf);
  await page.getByLabel(/Declaro que el archivo es el NDA/).check();
  await page.getByRole("button", { name: "Enviar NDA firmado" }).click();
  await expect(page.getByText("NDA firmado cargado por el comprador")).toBeVisible();
  await expect(page.getByText("Acceso pendiente").first()).toBeVisible();
  const href = await page.getByRole("link", { name: "nda-firmado.pdf" }).getAttribute("href");
  expect((await page.request.get(href!)).status()).toBe(200);

  // El vendedor lo ve en sus interesados
  const s = await (await browser.newContext()).newPage();
  await login(s, U.vendedor);
  await s.goto("/venta");
  await s.locator(".row", { hasText: "RW-1452" }).getByRole("link", { name: "Gestionar interesados" }).click();
  const row = s.locator(".row", { hasText: "Grupo Industrial Valmar" });
  await expect(row.getByRole("link", { name: "Ver NDA firmado" })).toBeVisible();
  expect((await s.request.get(href!)).status()).toBe(200);

  // Otro comprador no puede abrirlo
  const o = await (await browser.newContext()).newPage();
  await login(o, U.sierra);
  expect((await o.request.get(href!)).status()).toBe(404);
});
