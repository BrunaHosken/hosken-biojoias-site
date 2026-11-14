import { readFileSync } from "node:fs";
import { before, after, test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
let env;
const product = {
  name: "Orquídea",
  description: "Flor natural",
  priceCents: 10000,
  stock: 1,
  categoryId: "brincos",
  collectionId: "biojoias",
  status: "published",
  availability: "available",
  imageUrl: "",
};
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-hosken",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "categories/brincos"), {
      name: "Brincos",
      slug: "brincos",
      status: "published",
    });
    await setDoc(doc(db, "collections/biojoias"), {
      name: "Biojoias",
      slug: "biojoias",
      status: "published",
    });
    await setDoc(doc(db, "products/public"), product);
    await setDoc(doc(db, "products/draft"), { ...product, status: "draft" });
    await setDoc(doc(db, "orders/order-1"), {
      userId: "customer",
      totalCents: 10000,
      paymentStatus: "pending",
    });
  });
});
after(async () => {
  await env?.cleanup();
});
test("visitantes leem catálogo publicado, mas não rascunhos ou consultas sem filtro", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    getDocs(
      query(collection(db, "products"), where("status", "==", "published")),
    ),
  );
  await assertSucceeds(getDoc(doc(db, "products/public")));
  await assertFails(getDoc(doc(db, "products/draft")));
  await assertFails(getDocs(collection(db, "products")));
});
test("visitantes e clientes não podem cadastrar nem alterar estoque", async () => {
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("customer"),
  ]) {
    const db = context.firestore();
    await assertFails(setDoc(doc(db, "products/forbidden"), product));
    await assertFails(updateDoc(doc(db, "products/public"), { stock: 999 }));
    await assertFails(
      setDoc(doc(db, "categories/forbidden"), {
        name: "Novo",
        slug: "novo",
        status: "published",
      }),
    );
  }
});
test("admin pode criar produtos e ler rascunhos", async () => {
  const db = env.authenticatedContext("owner", { admin: true }).firestore();
  await assertSucceeds(getDocs(collection(db, "products")));
  await assertSucceeds(setDoc(doc(db, "products/admin-created"), product));
  await assertSucceeds(
    updateDoc(doc(db, "products/admin-created"), { status: "draft" }),
  );
});
test("preços fracionários, negativos, estoque inválido e categoria inexistente são rejeitados", async () => {
  const db = env.authenticatedContext("owner", { admin: true }).firestore();
  for (const patch of [
    { priceCents: -1 },
    { priceCents: 1.5 },
    { stock: -1 },
    { stock: 1.5 },
    { categoryId: "missing" },
    { extra: "injetado" },
  ])
    await assertFails(
      setDoc(doc(db, "products/invalid"), { ...product, ...patch }),
    );
});
test("usuário não pode promover sua própria conta", async () => {
  const db = env.authenticatedContext("customer").firestore();
  await assertSucceeds(
    setDoc(doc(db, "users/customer"), { displayName: "Cliente" }),
  );
  await assertFails(updateDoc(doc(db, "users/customer"), { admin: true }));
  await assertFails(
    setDoc(doc(db, "users/other"), { displayName: "Outra pessoa" }),
  );
});
test("pedido é privado e nem admin pode confirmar pagamento pelo navegador", async () => {
  await assertSucceeds(
    getDoc(
      doc(env.authenticatedContext("customer").firestore(), "orders/order-1"),
    ),
  );
  await assertFails(
    getDoc(
      doc(env.authenticatedContext("other").firestore(), "orders/order-1"),
    ),
  );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "orders/order-1")),
  );
  for (const context of [
    env.authenticatedContext("customer"),
    env.authenticatedContext("owner", { admin: true }),
  ])
    await assertFails(
      updateDoc(doc(context.firestore(), "orders/order-1"), {
        paymentStatus: "paid",
      }),
    );
});
test("conteúdo privado e coleções não implementadas ficam protegidos", async () => {
  const admin = env.authenticatedContext("owner", { admin: true }).firestore();
  const visitor = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    setDoc(doc(admin, "news/draft"), {
      title: "Novidade",
      body: "Em breve",
      status: "draft",
    }),
  );
  await assertFails(getDoc(doc(visitor, "news/draft")));
  await assertFails(
    setDoc(doc(visitor, "news/injected"), {
      title: "Spam",
      body: "Spam",
      status: "published",
    }),
  );
  await assertFails(
    setDoc(doc(admin, "conversations/blocked"), { text: "Sem regras ainda" }),
  );
});
