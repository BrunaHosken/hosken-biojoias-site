import {
  createDocument,
  getAccessToken,
  getDocument,
  listAuthUsers,
  PRODUCTION_PROJECT_ID,
  replaceDocument,
  requireProductionProject,
} from "./firestore-rest.mjs";

requireProductionProject(process.argv.slice(2));
const manifestPath = "systemSeeds/demo-v1";
const token = await getAccessToken();
if (await getDocument(manifestPath, token)) {
  throw new Error(
    "O seed demo-v1 já foi iniciado. Use o comando de limpeza antes de executá-lo novamente.",
  );
}

const runId = `demo-v1-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const records = [];
let manifest = { seedRunId: runId, state: "in-progress", records };
await createDocument(manifestPath, manifest, token);

async function persistManifest() {
  const current = await getDocument(manifestPath, token);
  if (!current || current.fields.seedRunId !== runId) {
    throw new Error("O registro de controle do seed foi alterado.");
  }
  await replaceDocument(manifestPath, manifest, current.updateTime, token);
}

async function seedRecord(path, data) {
  if (await getDocument(path, token)) return false;
  const record = { path };
  records.push(record);
  manifest = { seedRunId: runId, state: "in-progress", records };
  await persistManifest();
  const created = await createDocument(path, data, token);
  record.updateTime = created.updateTime;
  await persistManifest();
  return true;
}

const groups = {
  collections: {
    biojoias: {
      name: "Biojoias",
      slug: "biojoias",
      status: "published",
      description: "A delicadeza das flores, preservada em cada detalhe.",
    },
    eletroformacao: {
      name: "Eletroformação",
      slug: "eletroformacao",
      status: "draft",
      description: "Novas formas de transformar a natureza em arte.",
    },
    "flores-secas": {
      name: "Flores secas",
      slug: "flores-secas",
      status: "draft",
      description: "A beleza de florescer em outros tempos.",
    },
  },
  categories: {
    colar: { name: "Colares", slug: "colares", status: "published" },
    brinco: { name: "Brincos", slug: "brincos", status: "published" },
    conjunto: { name: "Conjuntos", slug: "conjuntos", status: "published" },
  },
  colors: {
    ouro: { name: "Ouro", slug: "ouro", status: "published" },
    prata: { name: "Prata", slug: "prata", status: "published" },
    bronze: { name: "Bronze", slug: "bronze", status: "published" },
  },
  products: {
    "orquidea-exemplo": {
      name: "Conjunto Orquídea",
      description:
        "Peça de demonstração inspirada nas referências enviadas. Flor natural preservada em resina. Preço e estoque fictícios para testes.",
      priceCents: 15900,
      stock: 1,
      lowStockThreshold: 2,
      categoryId: "conjunto",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
      imageUrl: "",
    },
    "colar-exemplo": {
      name: "Colar Jardim",
      description:
        "Peça de demonstração para testar o catálogo e o carrinho. Substitua pelos dados reais antes de vender.",
      priceCents: 8900,
      stock: 2,
      lowStockThreshold: 2,
      colorVariants: [
        { colorId: "ouro", colorName: "Ouro", stock: 1 },
        { colorId: "prata", colorName: "Prata", stock: 1 },
        { colorId: "bronze", colorName: "Bronze", stock: 0 },
      ],
      chainAddonPriceCents: 3000,
      categoryId: "colar",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
      imageUrl: "",
    },
    "brinco-exemplo": {
      name: "Brincos Jardim",
      description:
        "Peça demonstrativa esgotada, para testar a indicação de indisponibilidade.",
      priceCents: 7400,
      stock: 0,
      lowStockThreshold: 2,
      categoryId: "brinco",
      collectionId: "biojoias",
      status: "published",
      availability: "soldout",
      imageUrl: "",
    },
  },
  news: {
    "bem-vindo": {
      title: "Um novo espaço para florescer",
      body: "Estamos preparando a loja da Hosken. Em breve, você poderá conhecer as peças e os novos caminhos do ateliê.",
      status: "published",
    },
  },
};

let createdCount = 0;
for (const [collection, documents] of Object.entries(groups)) {
  for (const [id, data] of Object.entries(documents)) {
    if (await seedRecord(`${collection}/${id}`, data)) createdCount++;
  }
}

const users = await listAuthUsers(token);
const sampleOrders = [
  {
    id: "demo-order-completed",
    orderNumber: "DEMO-1001",
    daysAgo: 28,
    status: "completed",
    trackingCode: "",
    items: [
      {
        productId: "orquidea-exemplo",
        name: "Conjunto Orquídea",
        quantity: 1,
        unitPriceCents: 15900,
      },
    ],
    totalCents: 15900,
  },
  {
    id: "demo-order-in-transit",
    orderNumber: "DEMO-1002",
    daysAgo: 6,
    status: "in_transit",
    trackingCode: "DEMO-HOSKEN-002",
    items: [
      {
        productId: "colar-exemplo",
        name: "Colar Jardim",
        quantity: 1,
        unitPriceCents: 8900,
      },
      {
        productId: "orquidea-exemplo",
        name: "Conjunto Orquídea",
        quantity: 1,
        unitPriceCents: 15900,
      },
    ],
    totalCents: 24800,
  },
  {
    id: "demo-order-preparing",
    orderNumber: "DEMO-1003",
    daysAgo: 2,
    status: "preparing",
    trackingCode: "",
    items: [
      {
        productId: "brinco-exemplo",
        name: "Brincos Jardim",
        quantity: 1,
        unitPriceCents: 7400,
      },
    ],
    totalCents: 7400,
  },
];
const now = Date.now();
for (const user of users) {
  for (const order of sampleOrders) {
    const orderId = `${order.id}-${user.uid.replaceAll("/", "_")}`;
    const { id, daysAgo, ...data } = order;
    if (
      await seedRecord(`orders/${orderId}`, {
        ...data,
        userId: user.uid,
        customerName: "Cliente de demonstração",
        customerEmail: "",
        paymentStatus: "approved",
        createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
        isDemo: true,
      })
    ) {
      createdCount++;
    }
  }
}

manifest = {
  seedRunId: runId,
  state: "complete",
  projectId: PRODUCTION_PROJECT_ID,
  records,
};
await persistManifest();
console.info(
  `Seed de demonstração concluído em ${PRODUCTION_PROJECT_ID}: ${createdCount} documentos criados; ${users.length} contas receberam pedidos fictícios.`,
);
console.info(
  "Para remover apenas os documentos deste seed, use npm run firebase:seed:production:clean -- --project hosken-biojoias --confirm.",
);
