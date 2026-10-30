import type { ReactNode } from "react";
import { env } from "@/lib/env";

// Aviso de privacidad complementario de la plataforma: describe lo que la plataforma realmente trata,
// con qué proveedores y qué cookies usa. Complementa la Privacy Policy de Redwood (texto proporcionado por Redwood).
// Debe mantenerse alineado con el código: si se agrega un proveedor, una cookie o un dato nuevo, actualícelo.
export const PLATFORM_PRIVACY_DATE = "30 de octubre de 2026";

const S = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <section className="mt-32">
    <h2 className="h2" style={{ fontSize: 20 }}>{n}. {title}</h2>
    <div className="legal-body">{children}</div>
  </section>
);
const L = ({ items }: { items: ReactNode[] }) => (
  <ul>
    {items.map((i, k) => <li key={k}>{i}</li>)}
  </ul>
);
const Mail = () => <a href="mailto:legal@redwood.ventures">legal@redwood.ventures</a>;

export function PlatformPrivacy() {
  const name = env.platformName;
  return (
    <article className="legal-body">
      <div className="eyebrow">{name} · Redwood Capital Partners</div>
      <h1 className="h1-lg mt-12">Aviso de privacidad</h1>
      <p className="c-lead mt-8">Última actualización: {PLATFORM_PRIVACY_DATE}</p>
      <p className="mt-24">
        Este aviso explica cómo {name}, la red privada de transacciones de Redwood Capital Partners, trata sus datos personales. Complementa la{" "}
        <a href="#privacy-policy">Privacy Policy de Redwood Capital Partners</a>, que se reproduce más abajo y aplica en todo lo no previsto aquí.
      </p>

      <S n={1} title="Responsable y contacto">
        <p>
          El responsable del tratamiento es Redwood Capital Partners, a través de la entidad del grupo que opera la plataforma. Para cualquier asunto de
          privacidad, escriba a <Mail />.
        </p>
      </S>

      <S n={2} title="Datos que tratamos en la plataforma">
        <L
          items={[
            <><strong>Solicitud de acceso e invitación:</strong> nombre, correo, teléfono (opcional), organización, tipo de organización, interés y mensaje.</>,
            <><strong>Cuenta y perfil:</strong> nombre, cargo, teléfono, organización, sitio web, sectores y regiones de interés, rango de inversión y contraseña (se guarda cifrada, nunca en texto legible).</>,
            <><strong>NDA:</strong> datos del firmante (nombre, cargo, organización, a quién representa), fecha, dirección IP, navegador, versión y huella digital del documento, y el NDA firmado que usted cargue.</>,
            <><strong>Procesos de compra:</strong> solicitudes de información y de acceso, preguntas y respuestas, solicitudes de reunión, nivel de interés y favoritos.</>,
            <><strong>Publicaciones de venta:</strong> datos de la empresa (incluidos los confidenciales, como razón social y ciudad), cifras financieras y documentos que cargue el vendedor. Pueden contener datos personales de terceros, de cuya licitud responde quien los carga.</>,
            <><strong>Búsquedas de compra y propuestas:</strong> criterios de búsqueda, perfil anónimo, PDF del comprador y mensajes de las propuestas.</>,
            <><strong>Seguridad y bitácora:</strong> inicios de sesión, consultas y descargas de documentos, decisiones de acceso, dirección IP y navegador de la sesión, e intentos de acceso no autorizados.</>,
          ]}
        />
        <p>No solicitamos datos personales sensibles. Le pedimos no cargarlos en la plataforma salvo que sean indispensables para la operación.</p>
      </S>

      <S n={3} title="Para qué los usamos">
        <p>Finalidades necesarias para el servicio:</p>
        <L
          items={[
            "Evaluar su solicitud, crear y administrar su cuenta y asignar sus perfiles.",
            "Mostrar oportunidades, gestionar NDA, autorizaciones de acceso y documentos, y cruzar búsquedas de compra con oportunidades.",
            "Enviarle notificaciones y correos del servicio (invitaciones, avisos de acceso, coincidencias y propuestas).",
            "Proteger la confidencialidad: controles de acceso, marcas de agua, enlaces temporales y bitácora de actividad.",
            "Cumplir obligaciones legales y atender requerimientos de autoridad.",
          ]}
        />
        <p>
          No usamos los datos de la plataforma para publicidad ni los vendemos. Si en el futuro quisiéramos usarlos para una finalidad distinta, se lo
          informaríamos y, cuando la ley lo exija, le pediríamos su consentimiento.
        </p>
      </S>

      <S n={4} title="Con quién se comparten dentro de la plataforma">
        <L
          items={[
            "Cuando usted solicita información o acepta un NDA como comprador, el vendedor y su asesor ven su nombre, correo, organización y los datos del firmante.",
            "Los compradores ven la identidad de la empresa y los documentos solo cuando el vendedor autoriza su acceso.",
            "Las búsquedas de compra son privadas. Si publica un perfil anónimo, los vendedores no ven su nombre ni su organización; las propuestas que recibe no muestran la identidad del vendedor.",
            "El equipo de administración de Redwood puede consultar la información necesaria para operar, revisar y proteger la plataforma.",
          ]}
        />
      </S>

      <S n={5} title="Proveedores que tratan datos por cuenta nuestra">
        <p>Además de los proveedores indicados en la Privacy Policy, la plataforma usa:</p>
        <L
          items={[
            <><strong>Supabase</strong>: base de datos y almacenamiento privado de archivos (servidores en Estados Unidos).</>,
            <><strong>Vercel</strong>: alojamiento y ejecución de la plataforma (infraestructura en Estados Unidos y otros países).</>,
            <><strong>Resend</strong>: envío de correos del servicio (Estados Unidos).</>,
          ]}
        />
        <p>Estos proveedores actúan como encargados: tratan los datos solo para prestar su servicio y bajo sus propios compromisos de seguridad y confidencialidad.</p>
      </S>

      <S n={6} title="Cookies">
        <p>La plataforma usa únicamente cookies técnicas, necesarias para su funcionamiento:</p>
        <L
          items={[
            <><code>rw_session</code>: mantiene su sesión iniciada (vence a las 12 horas o al cerrar sesión).</>,
            <><code>rw_flash</code>: muestra avisos breves después de una acción (dura unos segundos).</>,
            <><code>rw_mode</code>: recuerda si un administrador eligió la vista de compra y venta.</>,
          ]}
        />
        <p>La plataforma no usa cookies analíticas ni de publicidad. Si las bloquea en su navegador, no podrá iniciar sesión.</p>
      </S>

      <S n={7} title="Cómo protegemos sus datos">
        <L
          items={[
            "Permisos aplicados en el servidor según su perfil y su relación con cada oportunidad.",
            "Contraseñas cifradas, sesiones con vencimiento y bloqueo temporal tras varios intentos fallidos.",
            "Archivos en almacenamiento privado, sin enlaces públicos permanentes: se entregan con enlaces personales que vencen a los 5 minutos y vuelven a comprobar el permiso.",
            "PDF servidos sin metadatos y, los confidenciales, con marca de agua que identifica al usuario.",
            "Bitácora de las acciones relevantes.",
          ]}
        />
        <p>Ningún sistema es infalible. La plataforma no cuenta con certificaciones de seguridad.</p>
      </S>

      <S n={8} title="Conservación">
        <p>
          Conservamos los datos mientras su cuenta esté activa y, después, durante los plazos previstos en la Privacy Policy (sección 9) y los necesarios para
          atender obligaciones legales o defender derechos. Los registros de NDA y la bitácora se conservan como evidencia de los procesos de confidencialidad.
        </p>
      </S>

      <S n={9} title="Sus derechos">
        <p>
          Puede solicitar el acceso, la rectificación, la cancelación u oposición al tratamiento de sus datos (derechos ARCO), revocar su consentimiento o pedir la
          cancelación de su cuenta escribiendo a <Mail />. Indique el derecho que desea ejercer, su nombre, el correo de su cuenta y adjunte una identificación
          oficial vigente. Responderemos dentro de los plazos que establezca la legislación aplicable. Algunos datos pueden conservarse cuando la ley lo exija o
          cuando sean necesarios para cumplir un NDA vigente.
        </p>
        <p>Parte de sus datos de perfil puede consultarla y corregirla usted mismo en «Mi perfil».</p>
      </S>

      <S n={10} title="Cambios a este aviso">
        <p>Publicaremos cualquier cambio en esta página con su fecha de actualización y, si es relevante, lo avisaremos dentro de la plataforma o por correo.</p>
      </S>
    </article>
  );
}
