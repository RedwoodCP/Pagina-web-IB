import { notFound } from "next/navigation";
import { LightHeader } from "@/components/light-header";
import { Banner } from "@/components/ui";
import { PrivacyPolicy } from "@/components/privacy-policy";

const DOCS: Record<string, string> = { privacidad: "Aviso de privacidad", terminos: "Términos de uso" };

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: doc === "privacidad" ? "Privacy Policy" : DOCS[doc] ?? "Documento" };
}

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const title = DOCS[doc];
  if (!title) notFound();
  return (
    <>
      <LightHeader action={{ href: "/", label: "Volver al inicio" }} />
      <div className="wrap" style={{ maxWidth: 760, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        {doc === "privacidad" ? (
          <PrivacyPolicy />
        ) : (
          <>
            <h1 className="h1-lg mb-24">{title}</h1>
            <Banner tone="warn">
              Texto pendiente. Este documento debe redactarlo y aprobarlo el área jurídica de Redwood Capital Partners antes de
              publicar la plataforma. No se incluye un texto de ejemplo para evitar que se tome como vigente.
            </Banner>
          </>
        )}
      </div>
    </>
  );
}
