import { expect, test } from "@playwright/test";
import { U, confirmDialog, login } from "./helpers";

// Se ejecuta al final: elimina los datos de demostración.
test.describe("Paso a operación real", () => {
  test("invitar administrador real, perfiles asignados y eliminar datos de demostración", async ({ page, browser }) => {
    // La cuenta demo no puede borrar los datos demo
    await login(page, U.admin);
    await page.goto("/admin/configuracion");
    await expect(page.getByText(/primero invite a un administrador real/)).toBeVisible();

    // Invitación con perfil Administrador
    await page.goto("/admin/invitaciones");
    await page.getByLabel(/^Correo electrónico/).fill("ignacio.e2e@redwood.test");
    await page.getByLabel("Perfil sugerido").selectOption("admin");
    await page.getByRole("button", { name: /Enviar invitación/ }).click();
    const adminLink = await page.getByLabel("Enlace de invitación").inputValue();
    // Invitación de compradora (perfil asignado, no editable por ella)
    await page.getByLabel(/^Correo electrónico/).fill("natalia.e2e@redwood.test");
    await page.getByLabel("Perfil sugerido").selectOption("comprador");
    await page.getByRole("button", { name: /Enviar invitación/ }).click();
    await expect(page.getByLabel("Enlace de invitación")).not.toHaveValue(adminLink);
    const buyerLink = await page.getByLabel("Enlace de invitación").inputValue();

    const c = await browser.newContext();
    const a = await c.newPage();
    await a.goto(new URL(adminLink).pathname);
    await a.getByLabel("Nombre completo").fill("Ignacio Prueba");
    await a.getByLabel(/^Contraseña/).fill("ClaveAdmin2026x");
    await a.getByLabel("Confirmar contraseña").fill("ClaveAdmin2026x");
    await a.getByRole("checkbox").check();
    await a.getByRole("button", { name: "Aceptar invitación y continuar" }).click();
    await expect(a).toHaveURL(/\/admin\/solicitudes/);

    // Compradora: el paso 3 muestra perfiles asignados, sin poder elegir vender
    const b = await (await browser.newContext()).newPage();
    await b.goto(new URL(buyerLink).pathname);
    await b.getByLabel("Nombre completo").fill("Natalia Prueba");
    await b.getByLabel(/^Contraseña/).fill("ClaveCompra2026x");
    await b.getByLabel("Confirmar contraseña").fill("ClaveCompra2026x");
    await b.getByRole("checkbox").check();
    await b.getByRole("button", { name: "Aceptar invitación y continuar" }).click();
    await expect(b).toHaveURL(/perfil\/configuracion/);
    await b.goto("/perfil/configuracion?paso=3");
    await expect(b.getByText("Perfiles asignados a su cuenta")).toBeVisible();
    await expect(b.getByRole("checkbox")).toHaveCount(0);

    // El administrador real elimina los datos de demostración
    await a.goto("/admin/configuracion");
    await a.getByRole("button", { name: "Eliminar datos de demostración" }).click();
    await a.locator("dialog[open]").getByRole("button", { name: "Eliminar definitivamente" }).click();
    await expect(a.getByText("Indique el motivo.")).toBeVisible();
    await a.locator("dialog[open]").getByRole("textbox").fill("borrar");
    await a.locator("dialog[open]").getByRole("button", { name: "Eliminar definitivamente" }).click();
    await expect(a.locator("dialog[open]").getByText("Escriba ELIMINAR para confirmar.")).toBeVisible();
    await confirmDialog(a, "Eliminar definitivamente", "ELIMINAR");
    await expect(a.getByText(/Datos de demostración eliminados/)).toBeVisible();
    await a.goto("/oportunidades");
    await expect(a.getByText("Aún no hay oportunidades publicadas")).toBeVisible();
    await expect(a.getByText("DEMOSTRACIÓN")).toHaveCount(0);
    await c.close();

    // La cuenta demo ya no existe
    const d = await (await browser.newContext()).newPage();
    await d.goto("/iniciar-sesion");
    await d.getByLabel("Correo electrónico").fill(U.admin);
    await d.getByLabel(/^Contraseña/).fill("Demo2026segura");
    await d.getByRole("button", { name: "Entrar" }).click();
    await expect(d.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  });
});
