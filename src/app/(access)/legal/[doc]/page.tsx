import { notFound } from "next/navigation";
import { LightHeader } from "@/components/light-header";
import { PrivacyPolicy } from "@/components/privacy-policy";
import { PlatformPrivacy } from "@/components/platform-privacy";
import { TermsOfUse } from "@/components/terms-of-use";

const DOCS: Record<string, string> = { privacidad: "Aviso de privacidad", terminos: "Términos de uso" };

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc] ?? "Documento" };
}

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!DOCS[doc]) notFound();
  return (
    <>
      <LightHeader action={{ href: "/", label: "Volver al inicio" }} />
      <div className="wrap" style={{ maxWidth: 760, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        {doc === "terminos" ? (
          <TermsOfUse />
        ) : (
          <>
            <PlatformPrivacy />
            {/* Política del grupo, tal como la proporcionó Redwood (en inglés). */}
            <div id="privacy-policy" style={{ borderTop: "1px solid rgba(26,26,26,.12)", marginTop: 56, paddingTop: 48 }}>
              <PrivacyPolicy />
            </div>
          </>
        )}
      </div>
    </>
  );
}
