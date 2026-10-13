import { createHash } from "node:crypto";
import { NDA_VERSION } from "./domain";

/**
 * Texto del NDA unilateral. Es un TEXTO DE EJEMPLO tomado del prototipo: debe sustituirlo
 * el área jurídica antes de operar con datos reales. Cualquier cambio de texto debe ir con
 * un nuevo NDA_VERSION para que el registro de aceptación conserve la versión exacta.
 */
export function ndaSections(code: string): [string, string][] {
  return [
    ["Objeto", `El Receptor recibirá información sobre la oportunidad ${code} con el único fin de evaluar una posible operación.`],
    ["Información confidencial", "Incluye la identidad de la empresa, sus accionistas, información financiera, comercial, legal y operativa, y cualquier documento compartido en el espacio privado."],
    ["Obligaciones", "El Receptor no divulgará la información a terceros salvo a sus asesores sujetos a obligaciones equivalentes, y no contactará a empleados, clientes ni proveedores sin autorización."],
    ["Acceso", "La firma de este acuerdo no otorga acceso automático. El vendedor o su asesor decidirá si autoriza el acceso y a qué documentos."],
    ["Vigencia", "Las obligaciones de confidencialidad se mantienen durante 24 meses, aun si el acceso es revocado."],
    ["Devolución", "A solicitud del vendedor, el Receptor destruirá la información recibida y confirmará por escrito."],
    ["Registro", "La plataforma registra la fecha, la versión de este texto y los datos del firmante. Cada consulta de documentos queda registrada."],
  ];
}

export function ndaText(code: string) {
  return `${NDA_VERSION}\n` + ndaSections(code).map(([t, b], i) => `${i + 1}. ${t}. ${b}`).join("\n");
}

export function ndaHash(code: string) {
  return createHash("sha256").update(ndaText(code)).digest("hex");
}
