import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ds-host";
function signature(value: string) {
  return createHmac("sha256", process.env.HOST_PASSWORD ?? "").update(value).digest("base64url");
}
export function checkPassword(value: string) {
  const expected = process.env.HOST_PASSWORD ?? "";
  if (!expected || !value || value.length > 200) return false;
  const left = Buffer.from(value), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function createHostSession() {
  const expires = `${Date.now() + 8 * 60 * 60 * 1000}`;
  const jar = await cookies();
  jar.set(COOKIE, `${expires}.${signature(expires)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/host", maxAge: 8 * 60 * 60 });
}
export async function clearHostSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/host", maxAge: 0 });
}
export async function isHost() {
  const value = (await cookies()).get(COOKIE)?.value ?? "";
  const [expires, supplied] = value.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
