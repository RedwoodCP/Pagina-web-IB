import { notFound } from "next/navigation";
import { LightHeader } from "@/components/light-header";
import { Banner } from "@/components/ui";

const DOCS: Record<string, string> = { privacidad: "Aviso de privacidad", terminos: "Términos de uso" };

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const title = DOCS[doc];
  if (!title) notFound();
  return (
    <>
      <LightHeader action={{ href: "/", label: "Volver al inicio" }} />
      <div className="wrap" style={{ maxWidth: 760, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        <h1 className="h1-lg mb-24">{title}</h1>
        <Banner tone="warn">
          Texto pendiente. Este documento debe redactarlo y aprobarlo el área jurídica de Redwood Capital Partners antes de
          publicar la plataforma. No se incluye un texto de ejemplo para evitar que se tome como vigente.
        </Banner>
      </div>
    </>
  );
}
