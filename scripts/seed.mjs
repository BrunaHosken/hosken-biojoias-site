// Este script nunca usa credenciais nem recursos de produção.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
initializeApp({ projectId: "demo-hosken" });
const auth = getAuth();
try {
  await auth.getUser("local-admin");
} catch (error) {
  if (error.code !== "auth/user-not-found") throw error;
  await auth.createUser({
    uid: "local-admin",
    email: "admin@hosken.local",
    password: "HoskenLocal2026!",
    displayName: "Administradora local",
  });
}
await auth.setCustomUserClaims("local-admin", { admin: true });
const db = getFirestore();
const groups = {
  collections: {
    biojoias: { name: "Biojoias", slug: "biojoias", status: "published" },
    eletroformacao: {
      name: "Eletroformação",
      slug: "eletroformacao",
      status: "published",
    },
    "flores-secas": {
      name: "Flores secas",
      slug: "flores-secas",
      status: "published",
    },
  },
  categories: {
    colar: { name: "Colares", slug: "colares", status: "published" },
    brinco: { name: "Brincos", slug: "brincos", status: "published" },
    conjunto: { name: "Conjuntos", slug: "conjuntos", status: "published" },
  },
  products: {
    "orquidea-exemplo": {
      name: "Conjunto Orquídea",
      description:
        "Cadastro de exemplo inspirado na referência enviada. Flor natural preservada em resina. Preço e estoque são demonstrativos; confirmar materiais e medidas antes da publicação.",
      priceCents: 15900,
      stock: 1,
      categoryId: "conjunto",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
      imageUrl: "",
    },
    "colar-exemplo": {
      name: "Colar Jardim",
      description:
        "Produto de demonstração para testar o catálogo e o carrinho. Substitua pelas informações reais da peça.",
      priceCents: 8900,
      stock: 2,
      categoryId: "colar",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
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
let count = 0;
for (const [group, documents] of Object.entries(groups)) {
  for (const [id, data] of Object.entries(documents)) {
    const ref = db.collection(group).doc(id);
    if (!(await ref.get()).exists) {
      await ref.set(data);
      count++;
    }
  }
}
const now = Date.now();
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
for (const order of sampleOrders) {
  const ref = db.collection("orders").doc(order.id);
  if (!(await ref.get()).exists) {
    const { id, daysAgo, ...data } = order;
    await ref.set({
      ...data,
      userId: "local-admin",
      paymentStatus: "approved",
      createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      isDemo: true,
    });
    count++;
  }
}
console.log(
  `${count} registros criados no emulador. Dados existentes preservados.`,
);
console.log(
  "Login local: admin@hosken.local / HoskenLocal2026! (somente emulador).",
);
