import "server-only";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET debe tener al menos 32 caracteres.");
    return "solo-desarrollo-no-usar-en-produccion-0000000000";
  }
  return s;
}

export const env = {
  get secret() {
    return secret();
  },
  appUrl: process.env.APP_URL || "http://localhost:3000",
  platformName: process.env.PLATFORM_NAME || "",
  showDemo: (process.env.SHOW_DEMO_DATA ?? "true") === "true",
  storageDir: process.env.STORAGE_DIR || "./storage",
  signatureProvider: (process.env.SIGNATURE_PROVIDER || "none") as "none" | "docusign" | "dropboxsign",
  emailProvider: process.env.EMAIL_PROVIDER || "none",
  isProd: process.env.NODE_ENV === "production",
};
