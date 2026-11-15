import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const firebaseAuth = require("firebase-tools/lib/auth");

export const PRODUCTION_PROJECT_ID = "hosken-biojoias";
const firestoreRoot = `https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents`;

export async function getAccessToken() {
  const account = firebaseAuth.getGlobalDefaultAccount();
  const refreshToken = account?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("Faça login no Firebase CLI antes de executar este comando.");
  }
  const token = await firebaseAuth.getAccessToken(refreshToken, [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase",
  ]);
  if (!token?.access_token) {
    throw new Error("O Firebase CLI não retornou uma credencial válida.");
  }
  return token.access_token;
}

function firestoreUrl(path) {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${firestoreRoot}/${encodedPath}`;
}

async function request(url, method, token, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firebase REST respondeu HTTP ${response.status}.`);
  }
  if (response.status === 204 || method === "DELETE") return {};
  return response.json();
}

export function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value) } };
  }
  throw new Error(`Tipo de campo Firestore não suportado: ${typeof value}`);
}

function encodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, encodeValue(value)]),
  );
}

function decodeValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(decodeValue);
  }
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

export async function getDocument(path, token) {
  const response = await request(firestoreUrl(path), "GET", token);
  if (!response) return null;
  return {
    fields: decodeFields(response.fields),
    updateTime: response.updateTime,
  };
}

export async function createDocument(path, fields, token) {
  const url = new URL(firestoreUrl(path));
  url.searchParams.set("currentDocument.exists", "false");
  return request(
    url,
    "PATCH",
    token,
    { fields: encodeFields(fields) },
  );
}

export async function replaceDocument(path, fields, updateTime, token) {
  const url = new URL(firestoreUrl(path));
  url.searchParams.set("currentDocument.updateTime", updateTime);
  return request(url, "PATCH", token, { fields: encodeFields(fields) });
}

export async function removeDocumentField(path, field, updateTime, token) {
  const url = new URL(firestoreUrl(path));
  url.searchParams.set("currentDocument.updateTime", updateTime);
  url.searchParams.set("updateMask.fieldPaths", field);
  return request(url, "PATCH", token, { fields: {} });
}

export async function deleteDocument(path, updateTime, token) {
  const url = new URL(firestoreUrl(path));
  url.searchParams.set("currentDocument.updateTime", updateTime);
  return request(url, "DELETE", token);
}

export async function listAuthUsers(token) {
  const users = [];
  let nextPageToken = "";
  do {
    const url = new URL(
      `https://identitytoolkit.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/accounts:batchGet`,
    );
    url.searchParams.set("maxResults", "1000");
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);
    const response = await request(url, "GET", token);
    users.push(...(response?.users || []));
    nextPageToken = response?.nextPageToken || "";
  } while (nextPageToken);
  return users.map((user) => ({ uid: user.localId }));
}

export function requireProductionProject(args) {
  if (!args.includes("--project") || !args.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(
      `Informe explicitamente --project ${PRODUCTION_PROJECT_ID}; nenhum outro projeto é aceito.`,
    );
  }
}
