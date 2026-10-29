import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { U, confirmDialog, login } from "./helpers";

const TMP = path.join(os.tmpdir(), "rw-e2e-perfil");
mkdirSync(TMP, { recursive: true });
const pdf = path.join(TMP, "perfil.pdf");
writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

test("el comprador publica un perfil anónimo; administración lo aprueba y un vendedor propone una empresa", async ({ page, browser }) => {
  // 1. Comprador: registra la búsqueda y la envía a revisión con su perfil PDF
  await login(page, U.pablo);
  await page.goto("/busquedas/nueva");
  await page.getByLabel("Mínimo").first().fill("10");
  await page.getByLabel("Mínimo").nth(1).fill("10");
  await page.locator("label.chip", { hasText: "Bajío" }).click();
  await page.locator("label.chip", { hasText: "Industrial y Manufactura" }).click();
  await page.getByRole("button", { name: "Registrar búsqueda" }).click();
  await expect(page).toHaveURL(/\/busquedas\/[a-z0-9]{20,}$/);
  const code = (await page.locator(".eyebrow").first().textContent())!.match(/BC-\d{4}/)![0];

  await page.getByLabel(/^Título anónimo/).fill("Corporativo busca empresa industrial en el Bajío");
  await page.getByLabel(/^Qué busca/).fill("Somos Valmar y buscamos un proveedor de manufactura para integrarlo verticalmente.");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText(/No incluya datos que identifiquen al comprador/)).toBeVisible();
  await page.getByLabel(/^Qué busca/).fill("Buscamos un proveedor de manufactura con clientes recurrentes para integrarlo verticalmente.");
  await page.getByLabel("Perfil del comprador (PDF)").setInputFiles(pdf);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText(/Enviado a revisión/)).toBeVisible();
  await expect(page.locator(".badge", { hasText: "En revisión" })).toBeVisible();

  // Antes de la aprobación, los vendedores no la ven
  const vc = await browser.newContext();
  const v = await vc.newPage();
  await login(v, U.vendedor);
  await v.goto("/compradores");
  await expect(v.getByText(code)).toHaveCount(0);

  // 2. Administración revisa y publica
  const ac = await browser.newContext();
  const a = await ac.newPage();
  await login(a, U.admin);
  await a.goto("/admin/busquedas");
  await a.locator(".row", { hasText: code }).getByRole("link", { name: "Ver" }).click();
  await a.getByRole("button", { name: "Aprobar y publicar" }).click();
  await confirmDialog(a, "Publicar");
  await expect(a.getByText(/es visible para vendedores/).first()).toBeVisible();

  // 3. Vendedor: ve el perfil anónimo (sin nombre ni organización) y propone una oportunidad
  await v.goto("/compradores");
  await v.locator(".row", { hasText: code }).getByRole("link", { name: "Ver" }).click();
  await expect(v.getByRole("heading", { name: "Corporativo busca empresa industrial en el Bajío" })).toBeVisible();
  const html = await v.content();
  expect(html).not.toContain("Valmar");
  expect(html).not.toContain("Pablo Ruiz");
  const href = await v.getByRole("link", { name: /Ver perfil del comprador/ }).getAttribute("href");
  const file = await v.request.get(href!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-disposition"]).toContain(`Perfil%20del%20comprador%20${code}.pdf`);
  await v.getByLabel(/^Mensaje para el comprador/).fill("Tenemos una empresa con más de 20 años, planta propia y contratos multianuales.");
  await v.getByRole("button", { name: "Enviar propuesta" }).click();
  await expect(v.getByText(/Propuesta enviada/)).toBeVisible();
  await vc.close();

  // Otro comprador sin perfil de venta no ve las búsquedas publicadas
  const mc = await browser.newContext();
  const m = await mc.newPage();
  await login(m, U.sierra);
  const r = await m.goto("/compradores");
  expect(r!.url()).not.toContain("/compradores");
  await mc.close();

  // 4. El comprador recibe la propuesta sin saber quién es el vendedor
  await page.goto("/notificaciones");
  await expect(page.getByText(new RegExp(`Un vendedor propuso la oportunidad RW-\\d{4} para su búsqueda ${code}`))).toBeVisible();
  await page.goto(page.url().replace("/notificaciones", "/busquedas"));
  await page.locator(".row", { hasText: code }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByText("Propuestas de vendedores · 1")).toBeVisible();
  await expect(page.getByText(/Un vendedor de la red ·/)).toBeVisible();
  expect(await page.content()).not.toContain("Ernesto Valdés");

  // Administración sí ve quién propuso
  await a.reload();
  await expect(a.getByText(/Ernesto Valdés \(vendedor@demo.redwood.test\)/)).toBeVisible();
  await ac.close();
});
