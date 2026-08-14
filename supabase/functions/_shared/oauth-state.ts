export interface OAuthStatePayload {
  provider: "ringcentral" | "quickbooks" | "google" | "dialpad";
  userId: string;
  companyId?: string;
  redirectUri: string;
  returnUrl?: string;
  expiresAt: number;
  nonce: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createOAuthState(payload: OAuthStatePayload, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(secret),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyOAuthState(state: string, secret: string): Promise<OAuthStatePayload | null> {
  try {
    if (typeof state !== "string" || state.length > 8192) return null;
    const [encodedPayload, encodedSignature, extra] = state.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;

    const isValid = await crypto.subtle.verify(
      "HMAC",
      await importHmacKey(secret),
      toArrayBuffer(fromBase64Url(encodedSignature)),
      new TextEncoder().encode(encodedPayload),
    );
    if (!isValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as OAuthStatePayload;
    const validProviders = ["ringcentral", "quickbooks", "google", "dialpad"];
    if (
      !validProviders.includes(payload.provider)
      || !payload.userId
      || !payload.redirectUri
      || !payload.nonce
      || !Number.isFinite(payload.expiresAt)
      || payload.expiresAt < Date.now()
      || payload.expiresAt > Date.now() + 15 * 60 * 1000
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
