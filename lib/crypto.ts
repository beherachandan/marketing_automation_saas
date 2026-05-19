import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw || raw.length < 16) throw new Error("CREDENTIAL_ENCRYPTION_KEY missing or too short")
  return scryptSync(raw, "conduct.saas.v1", 32)
}

/**
 * Encrypt a plaintext string. Output format: base64(iv || tag || ciphertext).
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString("base64")
}

/**
 * Decrypt a ciphertext produced by `encrypt`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, "base64")
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Ciphertext too short")
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
}

/**
 * Encrypt a JSON-serializable object.
 */
export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt into a typed object.
 */
export function decryptJson<T = unknown>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T
}
