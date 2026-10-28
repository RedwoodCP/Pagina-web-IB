import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-sans-3";
import "material-symbols/outlined.css";
import "./globals.css";
import { ToastHost } from "@/components/toast";
import { readFlash } from "@/lib/flash";

const name = process.env.PLATFORM_NAME || "Confidant";

export const metadata: Metadata = {
  title: { default: `${name} · Red privada de transacciones`, template: `%s · ${name}` },
  description: "Red privada de compraventa de empresas. Acceso por invitación.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/apple-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1A1A1A" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const flash = await readFlash();
  return (
    <html lang="es-MX">
      <body>
        {children}
        <ToastHost flash={flash} />
      </body>
    </html>
  );
}
