import type { Metadata } from "next";
import { LightHeader } from "@/components/light-header";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Estado de la solicitud" };

export default function EstadoSolicitud() {
  return (
    <>
      <LightHeader action={{ href: "/iniciar-sesion", label: "Iniciar sesión" }} />
      <div className="wrap" style={{ maxWidth: 640, padding: "clamp(40px, 7vw, 96px) var(--px)" }}>
        <div className="eyebrow">Solicitud de membresía</div>
        <h1 className="h1-lg" style={{ margin: "12px 0 12px" }}>Estado de su solicitud</h1>
        <p className="lead mb-24">Ingrese el correo y el folio que recibió al enviar la solicitud.</p>
        <StatusForm />
      </div>
    </>
  );
}
