import type { LegalDocument } from "../app/contexts";

export async function createLegalVersion(
  documents: LegalDocument[],
): Promise<string> {
  if (!documents.length) return "";

  const canonical = JSON.stringify(
    [...documents]
      .map(({ id, title, body, policyType = "general" }) => ({
        id,
        title,
        body,
        policyType,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  );

  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical),
    );
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback determinístico para navegadores sem Web Crypto. O identificador
  // serve apenas para detectar alterações de conteúdo, não como controle de acesso.
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < canonical.length; index += 1) {
    const code = canonical.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  const part = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  return part(first).repeat(4) + part(second).repeat(4);
}
