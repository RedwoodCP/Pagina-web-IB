import path from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { U, confirmDialog, login } from "./helpers";

const TMP = path.join(__dirname, "..", "test-results", "files");
mkdirSync(TMP, { recursive: true });
const pdf = path.join(TMP, "teaser.pdf");
writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
const fake = path.join(TMP, "fotos.pdf");
writeFileSync(fake, "esto no es un pdf");
const heic = path.join(TMP, "fotos_planta.heic");
writeFileSync(heic, "x");

test.describe("Vendedor y administración", () => {
  test("decisión de acceso del vendedor: autorizar y revocar", async ({ page, browser }) => {
    await login(page, U.mariana);
    await page.goto("/venta");
    await page.getByRole("link", { name: "Gestionar interesados" }).click();
    const row = page.locator(".row", { hasText: "Fondo Sierra Capital" });
    await expect(row.getByText("Acceso pendiente")).toBeVisible();
    await row.getByRole("button", { name: "Autorizar" }).click();
    await confirmDialog(page, "Autorizar");
    await expect(row.getByText("Acceso autorizado")).toBeVisible();

    const c2 = await browser.newContext();
    const p2 = await c2.newPage();
    await login(p2, U.sierra);
    await p2.goto("/oportunidades/RW-1042/espacio");
    await expect(p2.getByRole("heading", { level: 1 })).toContainText("Empaques Altiplano");

    await row.getByRole("button", { name: "Revocar acceso" }).click();
    await confirmDialog(page, "Revocar acceso", "Fin del proceso");
    await expect(row.getByText("Acceso revocado")).toBeVisible();
    await p2.goto("/oportunidades/RW-1042/espacio");
    await expect(p2.getByText("Espacio privado no disponible")).toBeVisible();
    await c2.close();

    // Un comprador no puede gestionar una publicación ajena
    const c3 = await browser.newContext();
    const p3 = await c3.newPage();
    await login(p3, U.pablo);
    await p3.goto(page.url());
    await expect(p3.getByText("No encontramos esta página")).toBeVisible();
    expect(await p3.content()).not.toContain("Fondo Sierra Capital");
    await c3.close();
  });

  test("asistente: borrador, validaciones, anonimato, archivos, envío y aprobación", async ({ page, browser }) => {
    await login(page, U.mariana);
    await page.goto("/venta/nueva");
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await expect(page).toHaveURL(/editar\?paso=1/);
    const editUrl = page.url();

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/Requerido\. Solo lo verán/)).toBeVisible();
    await expect(page.getByText("Seleccione un sector.")).toBeVisible();
    await page.getByLabel(/Nombre legal/).fill("Talleres Zentli, S.A. de C.V.");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado.")).toBeVisible();
    await page.getByLabel(/^Sector/).selectOption("Industrial y Manufactura");
    await page.getByLabel(/^Región/).selectOption("Bajío");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/paso=2/);

    await page.getByLabel(/^Tipo de operación/).selectOption("Venta total");
    await page.getByLabel(/^Título anónimo/).fill("Taller de maquinado de la marca Zentli");
    await page.getByLabel(/^Descripción breve/).fill("Taller de maquinado de precisión con clientes automotrices y planta propia en operación.");
    await page.getByLabel("Mínimo").fill("20");
    await page.getByLabel("Máximo").fill("10");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/No incluya datos que identifiquen a la empresa \(«Zentli»\)/)).toBeVisible();
    await expect(page.getByText(/Indique un rango válido/)).toBeVisible();
    await page.getByLabel(/^Título anónimo/).fill("Taller de maquinado de precisión para la industria automotriz");
    await page.getByLabel("Máximo").fill("24");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/paso=3/);

    await page.getByLabel(/^Ventas anuales/).fill("10");
    await page.getByLabel(/^EBITDA \(monto/).fill("12");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("El EBITDA no puede ser mayor que las ventas.")).toBeVisible();
    await page.getByLabel(/^EBITDA \(monto/).fill("2.5");
    await page.locator('input[name="visEbitda"][value="autorizados"]').check({ force: true });
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/paso=4/);

    // Teaser y NDA se cargan al elegir el archivo; formato y contenido verificados en el servidor
    await expect(page.getByText(/Falta cargar el NDA de la empresa/)).toBeVisible();
    const teaserForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Cargar teaser" }) });
    await teaserForm.locator('input[type="file"]').setInputFiles(fake);
    await expect(page.getByText("El contenido del archivo no corresponde a su extensión.")).toBeVisible();
    await teaserForm.locator('input[type="file"]').setInputFiles(pdf);
    await expect(page.getByText(/se mostrará como «Teaser RW-/)).toBeVisible();
    const ndaForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Cargar NDA" }) });
    await ndaForm.locator('input[type="file"]').setInputFiles(pdf);
    await expect(page.getByText(/se mostrará como «NDA RW-/)).toBeVisible();
    await expect(page.getByText(/Falta cargar el NDA de la empresa/)).toHaveCount(0);
    const docForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Cargar documento" }) });
    await docForm.locator('input[type="file"]').setInputFiles(heic);
    await expect(page.getByText(/Formato no admitido \(\.heic\)/)).toBeVisible();
    await docForm.locator('input[type="file"]').setInputFiles(pdf);
    await docForm.getByLabel("Permiso para compradores autorizados").selectOption("descarga");
    await docForm.getByRole("button", { name: "Cargar documento" }).click();
    await expect(page.getByText("«teaser.pdf» cargado.")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/paso=5/);
    const preview = page.locator("article.opp");
    await expect(preview).toContainText("Taller de maquinado de precisión");
    await expect(preview).not.toContainText("Zentli");
    await expect(preview.getByText("Confidencial").first()).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByRole("button", { name: "Enviar a revisión" }).click();
    await expect(page.getByText("Confirme que cuenta con autorización")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar a revisión" }).click();
    await expect(page).toHaveURL(/\/venta$/);
    await expect(page.locator(".row", { hasText: "Talleres Zentli" }).locator(".badge", { hasText: "En revisión" })).toBeVisible();
    // ya no es editable
    await page.goto(editUrl);
    await expect(page).not.toHaveURL(/editar/);

    // Administración aprueba
    const c = await browser.newContext();
    const a = await c.newPage();
    await login(a, U.admin);
    await a.goto("/admin/publicaciones");
    await a.locator(".row", { hasText: "Taller de maquinado de precisión" }).getByRole("link", { name: "Revisar" }).click();
    await a.getByRole("button", { name: "Solicitar cambios" }).click();
    await a.locator("dialog[open]").getByRole("button", { name: "Solicitar cambios" }).click();
    await expect(a.getByText("Indique el motivo.")).toBeVisible();
    await a.keyboard.press("Escape");
    await a.getByRole("button", { name: "Aprobar y publicar" }).click();
    await confirmDialog(a, "Aprobar y publicar");
    await expect(a.locator(".badge", { hasText: "Publicada" })).toBeVisible();
    await c.close();

    await page.goto("/oportunidades?q=maquinado de precisión");
    await expect(page.locator("article.opp")).toHaveCount(1);
  });

  test("administración: aprobar solicitud genera invitación; duplicados y revocación", async ({ page }) => {
    await login(page, U.admin);
    await page.goto("/admin/solicitudes?estado=pendiente");
    const row = page.locator(".row", { hasText: "Ricardo Salinas Vela" });
    await row.getByRole("button", { name: "Aprobar e invitar" }).click();
    await confirmDialog(page, "Aprobar e invitar");
    await expect(page.getByText(/Solicitud aprobada/)).toBeVisible();

    await page.goto("/admin/invitaciones");
    await expect(page.locator(".row", { hasText: "r.salinas@demo-capitalandino.test" }).locator(".badge", { hasText: "Enviada" })).toBeVisible();
    await page.getByLabel(/^Correo electrónico/).fill("r.salinas@demo-capitalandino.test");
    await page.getByRole("button", { name: /Enviar invitación/ }).click();
    await expect(page.getByText(/Ya existe una invitación vigente/)).toBeVisible();

    await page.getByLabel(/^Correo electrónico/).fill("invitado.e2e@e2e.test");
    await page.getByRole("button", { name: /Enviar invitación/ }).click();
    await expect(page.getByLabel("Enlace de invitación")).toHaveValue(/\/invitacion\//);
    const link = await page.getByLabel("Enlace de invitación").inputValue();

    await page.reload();
    const inv = page.locator(".row", { hasText: "invitado.e2e@e2e.test" });
    await inv.getByRole("button", { name: "Revocar" }).click();
    await confirmDialog(page, "Revocar");
    await expect(inv.locator(".badge", { hasText: "Revocada" })).toBeVisible();
    await page.context().clearCookies();
    await page.goto(new URL(link).pathname);
    await expect(page.getByText("La invitación fue revocada")).toBeVisible();

    // Bitácora registra las acciones
    await login(page, U.admin);
    await page.goto("/admin/bitacora?accion=invitation");
    await expect(page.getByText("Revocó una invitación").first()).toBeVisible();
  });
});
