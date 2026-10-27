import { expect, test } from "@playwright/test";
import { U, login } from "./helpers";

test.describe("Comprador", () => {
  test("catálogo: filtros en servidor, moneda visible y favoritos", async ({ page }) => {
    await login(page, U.pablo);
    await page.goto("/oportunidades");
    const cards = page.locator("article.opp");
    const total = await cards.count();
    expect(total).toBeGreaterThan(5);
    await expect(page.getByText("Ventas anuales (USD)").first()).toBeVisible();

    await page.getByRole("button", { name: /^Industria/ }).click();
    await page.getByRole("menuitemcheckbox", { name: "Salud" }).click();
    await expect(page).toHaveURL(/sector=Salud/);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("RW-1309");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(cards).toHaveCount(total);

    // margen EBITDA (porcentaje) es un filtro distinto del EBITDA monetario
    await page.goto("/oportunidades?margen=20-30");
    for (const t of await cards.allTextContents()) expect(t).toMatch(/2\d\.\d%/);
    await page.goto("/oportunidades?ebitda=5%2B");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("RW-1552");
    // MXN: los filtros de monto no mezclan monedas
    await page.goto("/oportunidades?moneda=MXN&ventas=250-500");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("MXN $");

    await page.goto("/oportunidades?q=berries");
    await cards.first().getByRole("button", { name: /Guardar RW-1552/ }).click();
    await expect(page.getByText("RW-1552 se guardó en favoritas.")).toBeVisible();
    await page.goto("/oportunidades?favoritas=1");
    await expect(cards).toHaveCount(1);
  });

  test("detalle anónimo: lo confidencial no viaja al navegador", async ({ page }) => {
    await login(page, U.pablo);
    const res = await page.goto("/oportunidades/RW-1603");
    const html = await res!.text();
    // Nombre legal, ciudad y EBITDA confidencial no deben estar en la respuesta
    expect(html).not.toContain("Colegios Cumbres");
    expect(html).not.toContain("Monterrey");
    expect(html).not.toMatch(/US\$\s*2\.3\s*M/);
    await expect(page.getByText("Confidencial").first()).toBeVisible();
    await expect(page.getByText("Identidad protegida")).toBeVisible();

    // El teaser se sirve sin nombre original
    await page.goto("/oportunidades/RW-1042");
    const teaser = page.getByRole("link", { name: "Ver teaser" });
    const href = await teaser.getAttribute("href");
    const r = await page.request.get(href!, { maxRedirects: 5 });
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("application/pdf");
    expect(r.headers()["content-disposition"]).toContain("Teaser%20RW-1042.pdf");
  });

  test("NDA: validaciones, aceptación registrada y acceso aún pendiente", async ({ page }) => {
    await login(page, U.pablo);
    await page.goto("/oportunidades/RW-1215");
    await page.getByRole("button", { name: "Solicitar información" }).last().click();
    await expect(page).toHaveURL(/RW-1215\/nda/);
    // NDA propio de la empresa, visible y descargable para quien solicitó información
    await expect(page.locator('iframe[title="NDA RW-1215"]')).toBeVisible();
    const dl = await page.request.get((await page.getByRole("link", { name: "Descargar" }).getAttribute("href"))!);
    expect(dl.status()).toBe(200);
    expect(dl.headers()["content-disposition"]).toContain("NDA%20RW-1215.pdf");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Confirme que leyó el acuerdo completo.")).toBeVisible();
    await page.getByLabel("He leído el acuerdo completo").check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel(/^Cargo/).fill("");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Indique el cargo del firmante.")).toBeVisible();
    await page.getByLabel(/^Cargo/).fill("Director de desarrollo corporativo");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Sin proveedor de firma electrónica configurado.")).toBeVisible();
    await expect(page.getByText(/no es\s+una firma electrónica avanzada/)).toBeVisible();
    await page.getByLabel(/Escriba su nombre completo/).fill("Otra Persona");
    await page.getByRole("button", { name: "Registrar aceptación del NDA" }).click();
    await expect(page.getByText(/Escriba el nombre del firmante exactamente/)).toBeVisible();
    await page.getByLabel(/Escriba su nombre completo/).fill("Pablo Ruiz");
    await page.getByLabel(/Acepto el acuerdo de confidencialidad/).check();
    await page.getByRole("button", { name: "Registrar aceptación del NDA" }).click();
    await expect(page.getByText("Estado de su solicitud")).toBeVisible();
    await expect(page.getByText("Acceso pendiente").first()).toBeVisible();
    await expect(page.getByText(/Aceptación registrada en la plataforma/)).toBeVisible();

    // Firmar no libera el espacio privado
    await page.goto("/oportunidades/RW-1215/espacio");
    await expect(page.getByText("Espacio privado no disponible")).toBeVisible();
    await expect(page.getByText("pendiente de autorización")).toBeVisible();
  });

  test("sin autorización no se abren documentos, ni con enlace ajeno", async ({ page, browser }) => {
    // Mariana (autorizada en RW-1187) obtiene un enlace firmado
    await login(page, U.mariana);
    await page.goto("/oportunidades/RW-1187/espacio?tab=documentos");
    const dl = page.getByRole("link", { name: "Descargar" }).first();
    const entry = await dl.getAttribute("href");
    const first = await page.request.get(entry!, { maxRedirects: 0 });
    expect(first.status()).toBe(303);
    const signed = first.headers()["location"]!;
    const ok = await page.request.get(signed);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("no-store");
    const docId = entry!.split("/")[3]!;

    // Pablo (sin proceso en RW-1187) no puede usar ni el enlace estable ni el firmado
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await login(p2, U.pablo);
    const direct = await p2.request.get(`/api/documentos/${docId}/abrir?modo=descargar`, { maxRedirects: 0 });
    expect(direct.status()).toBe(403);
    const stolen = await p2.request.get(signed);
    expect(stolen.status()).toBe(401);
    const room = await p2.goto("/oportunidades/RW-1187/espacio");
    expect(await room!.text()).not.toContain("Distribuidora Médica del Norte");
    await ctx.close();

    // Organización excluida: no ve la oportunidad ni por URL
    const c3 = await browser.newContext();
    const p3 = await c3.newPage();
    await login(p3, U.ocotal);
    await p3.goto("/oportunidades");
    await expect(p3.locator("article.opp", { hasText: "RW-1388" })).toHaveCount(0);
    await p3.goto("/oportunidades/RW-1388");
    await expect(p3.getByText("No encontramos esta página")).toBeVisible();
    expect(await p3.content()).not.toContain("Productor de botanas");
    await c3.close();
  });

  test("documento restringido requiere solicitud específica", async ({ page }) => {
    await login(page, U.mariana);
    await page.goto("/oportunidades/RW-1187/espacio?tab=documentos&cat=Personal");
    const row = page.locator(".row", { hasText: "Organigrama" });
    await expect(row.getByText("Restringido")).toBeVisible();
    await row.getByRole("button", { name: "Solicitar acceso" }).click();
    await expect(row.getByText("Acceso solicitado")).toBeVisible();
  });
});
