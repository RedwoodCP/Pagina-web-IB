import { expect, test } from "@playwright/test";
import { U, login } from "./helpers";

test.describe("Acceso privado", () => {
  test("la página pública presenta la red y sus accesos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Compra y venta de empresas");
    await expect(page.getByRole("img", { name: "Redwood Capital Partners" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Solicitar acceso" }).first().click();
    await expect(page).toHaveURL(/solicitar-acceso/);
  });

  test("solicitud incompleta muestra errores claros; completa entrega folio consultable", async ({ page }) => {
    await page.goto("/solicitar-acceso");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByText("Ingrese su nombre completo.")).toBeVisible();
    await expect(page.getByText("Ingrese un correo electrónico válido.")).toBeVisible();
    await expect(page.getByText("Seleccione su interés principal.")).toBeVisible();
    await expect(page.getByText("Debe aceptar el aviso de privacidad.")).toBeVisible();

    await page.getByLabel("Nombre completo").fill("Ana Prueba");
    await page.getByLabel("Correo corporativo").fill("ana.prueba@e2e.test");
    await page.getByLabel(/^Organización/).fill("Fondo E2E");
    await page.getByLabel("Tipo de organización").selectOption("fondo");
    await page.locator("label.chip", { hasText: "Comprar y vender" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page).toHaveURL(/solicitud-enviada\?folio=SOL-/);
    const folio = new URL(page.url()).searchParams.get("folio")!;

    await page.goto("/estado-solicitud");
    await page.getByLabel("Correo de la solicitud").fill("ana.prueba@e2e.test");
    await page.getByLabel("Folio").fill(folio);
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.locator(".badge", { hasText: "Pendiente" })).toBeVisible();

    // folio con otro correo: no revela nada
    await page.getByLabel("Correo de la solicitud").fill("otra@e2e.test");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("No encontramos una solicitud con ese folio y correo.")).toBeVisible();
  });

  test("invitaciones vencidas, revocadas e inválidas no pueden usarse", async ({ page }) => {
    await page.goto("/invitacion/demo-invitacion-vencida");
    await expect(page.getByText("La invitación venció")).toBeVisible();
    await expect(page.getByRole("button", { name: /Aceptar invitación/ })).toHaveCount(0);
    await page.goto("/invitacion/demo-invitacion-revocada");
    await expect(page.getByText("La invitación fue revocada")).toBeVisible();
    await page.goto("/invitacion/no-existe-123");
    await expect(page.getByText("Enlace no válido")).toBeVisible();
  });

  test("aceptar invitación vigente: validación, perfil en 4 pasos y panel", async ({ page }) => {
    await page.goto("/invitacion/demo-invitacion-vigente");
    await expect(page.getByLabel("Correo electrónico")).toHaveValue("nuevo.miembro@demo.redwood.test");
    await page.getByRole("button", { name: "Aceptar invitación y continuar" }).click();
    await expect(page.getByText("Ingrese su nombre completo.")).toBeVisible();
    await expect(page.getByText("Debe aceptar los términos de uso.")).toBeVisible();
    await page.getByLabel("Nombre completo").fill("Nuevo Miembro");
    await page.getByLabel(/^Contraseña/).fill("corta");
    await page.getByLabel("Confirmar contraseña").fill("otra");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar invitación y continuar" }).click();
    await expect(page.getByText("La contraseña debe tener al menos 10 caracteres.")).toBeVisible();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    await page.getByLabel(/^Contraseña/).fill("ClaveSegura2026");
    await page.getByLabel("Confirmar contraseña").fill("ClaveSegura2026");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Aceptar invitación y continuar" }).click();
    await expect(page).toHaveURL(/perfil\/configuracion/);

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Indique su cargo.")).toBeVisible();
    await page.getByLabel("Cargo").fill("Director");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 2 de 4")).toBeVisible();
    await page.getByLabel(/^Organización/).fill("Nueva Org E2E");
    await page.getByLabel("Tipo de organización").selectOption("corporativo");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 3 de 4")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 4 de 4")).toBeVisible();
    await page.locator("label.chip", { hasText: "Manufactura" }).click();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nuevo");

    // La misma invitación ya no sirve
    await page.context().clearCookies();
    await page.goto("/invitacion/demo-invitacion-vigente");
    await expect(page.getByText("Esta invitación ya fue aceptada")).toBeVisible();
  });

  test("inicio de sesión: errores genéricos y rutas privadas protegidas", async ({ page }) => {
    await page.goto("/oportunidades");
    await expect(page).toHaveURL(/iniciar-sesion/);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Correo o contraseña incompletos")).toBeVisible();
    await page.getByLabel("Correo electrónico").fill(U.mariana);
    await page.getByLabel(/^Contraseña/).fill("incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();

    await login(page, U.mariana);
    await page.goto("/admin/solicitudes");
    await expect(page).toHaveURL(/sin-permiso/);
    const api = await page.request.get("/api/archivos/token-falso.firma");
    expect(api.status()).toBe(410);
  });
});
