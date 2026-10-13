import "server-only";
import { cookies } from "next/headers";

/** Deja un aviso para mostrarlo tras una redirección. */
export async function setFlash(message: string) {
  (await cookies()).set("rw_flash", encodeURIComponent(message), { path: "/", maxAge: 30, sameSite: "lax" });
}

export async function readFlash(): Promise<string | null> {
  const v = (await cookies()).get("rw_flash")?.value;
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return null;
  }
}
