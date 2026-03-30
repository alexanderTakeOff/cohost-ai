import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const raw = process.env.HOSTIFY_KEY_ENCRYPTION_SECRET;

  if (!raw) {
    throw new Error("Missing HOSTIFY_KEY_ENCRYPTION_SECRET environment variable.");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(cipherText: string) {
  const [ivB64, authTagB64, payloadB64] = cipherText.split(":");

  if (!ivB64 || !authTagB64 || !payloadB64) {
    throw new Error("Invalid encrypted secret format.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const payload = Buffer.from(payloadB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
}
