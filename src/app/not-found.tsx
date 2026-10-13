import Link from "next/link";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="wrap" style={{ maxWidth: 640, padding: "clamp(40px, 8vw, 112px) var(--px)" }}>
      <Empty icon="search_off" title="No encontramos esta página" text="La dirección no existe o no tiene permiso para verla.">
        <Link href="/" className="btn">Ir al inicio</Link>
      </Empty>
    </div>
  );
}
