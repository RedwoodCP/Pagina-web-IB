import Link from "next/link";
import { LightHeader } from "@/components/light-header";
import { Empty } from "@/components/ui";

export default function SinPermiso() {
  return (
    <>
      <LightHeader />
      <div className="wrap" style={{ maxWidth: 640, padding: "clamp(40px, 8vw, 112px) var(--px)" }}>
        <Empty icon="lock" title="No tiene permiso para ver esta sección" text="Si necesita acceso, escriba al equipo de administración.">
          <Link href="/" className="btn">Ir al inicio</Link>
        </Empty>
      </div>
    </>
  );
}
