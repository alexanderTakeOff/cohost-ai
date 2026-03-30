import { createHmac } from "node:crypto";

export function signPayload(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
