import { expect, type Page } from "@playwright/test";

export const PASS = "Demo2026segura";
export const U = {
  admin: "admin@demo.redwood.test",
  mariana: "mariana.robles@demo.redwood.test",
  javier: "javier.ortega@demo.redwood.test",
  pablo: "pablo@demo.redwood.test",
  sierra: "a.montes@demo.redwood.test",
  ocotal: "ocotal@demo.redwood.test",
  vendedor: "vendedor@demo.redwood.test",
};

export async function login(page: Page, email: string, password = PASS) {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel(/^Contraseña/).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/iniciar-sesion/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Confirma un diálogo de ActionButton. */
export async function confirmDialog(page: Page, label: string, reason?: string) {
  const dlg = page.locator("dialog[open]");
  await expect(dlg).toBeVisible();
  if (reason) await dlg.getByRole("textbox").fill(reason);
  await dlg.getByRole("button", { name: label, exact: true }).click();
  await expect(dlg).toBeHidden();
}
