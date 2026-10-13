import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function hmac(payload: string): string {
  return createHmac("sha256", env.secret).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function shortRef(prefix: string, n = 6): string {
  const b = randomBytes(n);
  return prefix + "-" + Array.from(b, (x) => ALPH[x % ALPH.length]).join("");
}
