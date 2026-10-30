import type { ReactNode } from "react";
import Link from "next/link";
import { env } from "@/lib/env";

// Términos de uso de la plataforma. Redactados a partir de cómo funciona la plataforma; deben revisarlos
// los asesores legales de Redwood Capital Partners. Al cambiarlos, actualice TERMS_DATE.
export const TERMS_DATE = "30 de octubre de 2026";

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

export function TermsOfUse() {
  const name = env.platformName;
  return (
    <article className="legal-body">
      <div className="eyebrow">{name} · Redwood Capital Partners</div>
      <h1 className="h1-lg mt-12">Términos de uso</h1>
      <p className="c-lead mt-8">Última actualización: {TERMS_DATE}</p>
      <p className="mt-24">
        Estos Términos regulan el acceso y el uso de {name}, la red privada de transacciones operada por Redwood Capital Partners («Redwood», «nosotros»), en la
        que compradores, vendedores y asesores evalúan de forma confidencial oportunidades de compraventa de empresas. Al crear una cuenta, aceptar una
        invitación o usar la plataforma, usted («el Usuario») acepta estos Términos y el <Link href="/legal/privacidad">Aviso de privacidad</Link>. Si actúa en
        nombre de una organización, declara que tiene facultades para obligarla.
      </p>

      <S n={1} title="Acceso a la plataforma">
        <L
          items={[
            "El acceso es privado: solo por invitación de nuestro equipo o mediante una solicitud que Redwood aprueba a su discreción. Podemos rechazar una solicitud sin expresar el motivo.",
            "Las invitaciones son personales, de un solo uso y vencen a los 14 días.",
            "La plataforma está dirigida a personas mayores de edad que actúan con fines profesionales o empresariales (inversionistas, empresarios, directivos y asesores). No está dirigida a consumidores.",
            "Los perfiles (comprador, vendedor, asesor representante y administración) los asigna Redwood. Cada perfil da acceso solo a las funciones que le corresponden.",
          ]}
        />
      </S>

      <S n={2} title="Cuenta y seguridad">
        <L
          items={[
            "La cuenta es personal e intransferible. El Usuario es responsable de mantener su contraseña en secreto y de toda actividad realizada con su cuenta.",
            "Por seguridad, la sesión vence automáticamente y la cuenta se bloquea temporalmente tras varios intentos fallidos de inicio de sesión.",
            "El Usuario debe proporcionar información veraz y actualizada sobre su identidad, su organización y su cargo, y avisarnos de inmediato si sospecha un uso no autorizado de su cuenta.",
          ]}
        />
      </S>

      <S n={3} title="Cómo funciona la confidencialidad">
        <L
          items={[
            "Las oportunidades se presentan de forma anónima, con un identificador (p. ej. RW-1042), sector, región y las métricas que el vendedor decide mostrar. El nombre de la empresa y los datos que la identifican solo se comparten con compradores autorizados.",
            "Cada oportunidad tiene su propio acuerdo de confidencialidad (NDA), normalmente el que proporciona el vendedor o su asesor.",
            "Firmar o aceptar el NDA no concede acceso. El acceso al espacio privado y a los documentos lo decide el vendedor o su asesor y, de forma excepcional, administración. El acceso puede revocarse en cualquier momento.",
            "Los documentos se entregan mediante enlaces temporales personales; los PDF confidenciales se muestran con marca de agua que identifica al Usuario.",
          ]}
        />
      </S>

      <S n={4} title="Acuerdos de confidencialidad y registro de aceptación">
        <p>
          El NDA de cada oportunidad es un contrato entre el comprador y el vendedor (o quien este designe); Redwood no es parte de él salvo que el propio
          documento lo indique. La plataforma permite (a) cargar el NDA firmado por el comprador o (b) registrar su aceptación en la plataforma, con nombre,
          cargo, organización, fecha, dirección IP, navegador, versión y huella digital del documento.
        </p>
        <p>
          <strong>El registro de aceptación no es una firma electrónica avanzada</strong> ni sustituye la firma que el vendedor requiera. Su validez y efectos
          dependen del propio NDA y de la ley aplicable. Redwood no garantiza el cumplimiento del NDA por las partes.
        </p>
      </S>

      <S n={5} title="Obligaciones del Usuario">
        <p>El Usuario se obliga a:</p>
        <L
          items={[
            "Usar la información de la plataforma únicamente para evaluar la operación correspondiente y tratarla como confidencial, aun antes de firmar un NDA.",
            "No intentar identificar a una empresa anónima ni contactar directamente a la empresa, sus accionistas, empleados, clientes o proveedores sin la autorización del vendedor o de su asesor.",
            "No copiar, descargar de forma masiva, reenviar, publicar ni compartir documentos o información de la plataforma con terceros no autorizados, salvo con sus asesores sujetos a confidencialidad y en los términos del NDA aplicable.",
            "No eliminar ni alterar marcas de agua, ni intentar eludir los controles de acceso de la plataforma.",
            "No compartir su cuenta ni acceder con la cuenta de otra persona.",
            "No cargar archivos con virus o código malicioso, ni información ilícita o que infrinja derechos de terceros.",
            "Cumplir las leyes aplicables, incluidas las de prevención de lavado de dinero, competencia económica y protección de datos personales.",
          ]}
        />
      </S>

      <S n={6} title="Publicaciones de vendedores y asesores">
        <L
          items={[
            "Quien publica una oportunidad declara que es propietario, directivo o asesor autorizado de la empresa, y que tiene derecho a compartir la información y los documentos que carga.",
            "El vendedor es responsable de la veracidad y la exactitud de la información, del anonimato del título, la descripción y el teaser, y del NDA que proporciona.",
            "Cada publicación pasa por la revisión de Redwood antes de mostrarse en el catálogo. Podemos solicitar cambios, no publicar o retirar una publicación.",
            "El vendedor decide quién accede al espacio privado y qué documentos puede ver o descargar cada comprador.",
          ]}
        />
      </S>

      <S n={7} title="Búsquedas de compra y propuestas">
        <L
          items={[
            "El comprador puede registrar búsquedas de compra. Son privadas: solo las ven él y administración, salvo que decida publicar un perfil anónimo para vendedores, que Redwood revisa antes de mostrarlo.",
            "Al cruzar búsquedas con oportunidades, al comprador nunca se le comparan cifras que el vendedor marcó como confidenciales.",
            "Las propuestas de vendedores a una búsqueda se muestran al comprador sin revelar la identidad del vendedor. Redwood sí conoce quién propone.",
          ]}
        />
      </S>

      <S n={8} title="Naturaleza del servicio y ausencia de garantías">
        <L
          items={[
            "La plataforma es una herramienta para presentar y evaluar oportunidades de forma confidencial. La información no constituye una oferta de venta ni una solicitud de compra de valores, ni asesoría de inversión, legal, fiscal o contable.",
            "Redwood no verifica ni garantiza la exactitud, integridad o actualidad de la información que cargan los Usuarios, ni el resultado de ninguna operación. Cada Usuario debe realizar su propia revisión (due diligence) con sus asesores.",
            "Cualquier operación se rige exclusivamente por los contratos que las partes firmen fuera de la plataforma. Los servicios de asesoría de Redwood, cuando los haya, se pactan por escrito por separado.",
            "La plataforma no muestra certificaciones ni distintivos de verificación de los Usuarios o de las empresas.",
            "Procuramos que la plataforma esté disponible y segura, pero se ofrece «tal cual» y puede tener interrupciones por mantenimiento o causas ajenas.",
          ]}
        />
      </S>

      <S n={9} title="Responsabilidad">
        <p>
          En la medida que lo permita la ley aplicable, Redwood y sus fondos, socios, directivos y empleados no serán responsables por daños indirectos,
          incidentales o consecuenciales, ni por pérdidas de oportunidades o de utilidades, derivados del uso de la plataforma, de la información publicada por
          otros Usuarios o del incumplimiento de un NDA por un Usuario. El Usuario responde frente a Redwood y frente a terceros por los daños que cause al
          incumplir estos Términos o el NDA aplicable.
        </p>
      </S>

      <S n={10} title="Registro de actividad">
        <p>
          Para seguridad y trazabilidad, la plataforma registra en una bitácora las acciones relevantes: inicios de sesión, consultas y descargas de
          documentos, aceptaciones de NDA, decisiones de acceso, cambios de permisos e intentos de acceso no autorizados. Administración y, en lo que le
          corresponde, el vendedor pueden consultar esta información. Su tratamiento se describe en el <Link href="/legal/privacidad">Aviso de privacidad</Link>.
        </p>
      </S>

      <S n={11} title="Propiedad intelectual">
        <p>
          La plataforma, su diseño, su software y las marcas {name} y Redwood Capital Partners pertenecen a Redwood o a sus licenciantes. Los Usuarios conservan
          los derechos sobre los documentos que cargan y otorgan a Redwood una licencia limitada para almacenarlos, procesarlos (por ejemplo, para quitar
          metadatos o añadir marcas de agua) y mostrarlos a los Usuarios autorizados.
        </p>
      </S>

      <S n={12} title="Suspensión y terminación">
        <p>
          Redwood puede suspender o cancelar una cuenta, retirar publicaciones o revocar accesos si detecta un incumplimiento de estos Términos, un riesgo para la
          confidencialidad o la seguridad, o por requerimiento de autoridad. El Usuario puede solicitar la cancelación de su cuenta en cualquier momento escribiendo
          a <Mail />. Las obligaciones de confidencialidad subsisten después de la terminación.
        </p>
      </S>

      <S n={13} title="Cambios a estos Términos">
        <p>
          Podemos modificar estos Términos. La versión vigente se publica en esta página con su fecha de actualización. Si los cambios son relevantes, lo
          avisaremos dentro de la plataforma o por correo. El uso continuo después de la publicación implica la aceptación de los cambios.
        </p>
      </S>

      <S n={14} title="Ley aplicable y controversias">
        <p>
          Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes
          que correspondan conforme a dicha legislación, sin perjuicio de lo que establezca el NDA o el contrato específico de cada operación.
        </p>
      </S>

      <S n={15} title="Contacto">
        <p>
          Para dudas sobre estos Términos, escriba a <Mail />.
        </p>
      </S>
    </article>
  );
}
