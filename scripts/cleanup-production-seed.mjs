import {
  deleteDocument,
  getAccessToken,
  getDocument,
  PRODUCTION_PROJECT_ID,
  requireProductionProject,
} from "./firestore-rest.mjs";

const args = process.argv.slice(2);
requireProductionProject(args);
if (!args.includes("--confirm")) {
  throw new Error(
    "Para confirmar a remoção do seed, acrescente --confirm ao comando.",
  );
}

const token = await getAccessToken();
const manifestPath = "systemSeeds/demo-v1";
const manifest = await getDocument(manifestPath, token);
if (!manifest) {
  console.info("Não há manifesto de seed demo-v1 para limpar.");
  process.exit(0);
}
const runId = manifest.fields.seedRunId;
const records = Array.isArray(manifest.fields.records)
  ? manifest.fields.records
  : [];
let deletedCount = 0;
let preservedCount = 0;
let modifiedCount = 0;

for (const record of records) {
  const path = typeof record === "string" ? record : record?.path;
  if (typeof path !== "string" || !record?.updateTime) {
    preservedCount++;
    continue;
  }
  const document = await getDocument(path, token);
  if (!document) continue;
  if (document.updateTime !== record.updateTime) modifiedCount++;
  await deleteDocument(path, document.updateTime, token);
  deletedCount++;
}

const currentManifest = await getDocument(manifestPath, token);
if (currentManifest?.fields.seedRunId === runId) {
  await deleteDocument(manifestPath, currentManifest.updateTime, token);
}
console.info(
  `Limpeza concluída em ${PRODUCTION_PROJECT_ID}: ${deletedCount} documentos de demonstração removidos (${modifiedCount} haviam sido atualizados nos testes); ${preservedCount} preservados por não haver confirmação de que foram criados pelo seed.`,
);
