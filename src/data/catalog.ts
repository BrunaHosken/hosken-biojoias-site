import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Content, Product, Taxonomy } from "./models";

const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === "true";

const previewRecords: Record<string, unknown[]> = {
  collections: [
    {
      id: "biojoias",
      name: "Biojoias",
      slug: "biojoias",
      status: "published",
      description: "A delicadeza das flores, preservada em cada detalhe.",
    },
  ] satisfies Taxonomy[],
  categories: [
    { id: "colar", name: "Colares", slug: "colares", status: "published" },
    { id: "brinco", name: "Brincos", slug: "brincos", status: "published" },
    {
      id: "conjunto",
      name: "Conjuntos",
      slug: "conjuntos",
      status: "published",
    },
  ] satisfies Taxonomy[],
  products: [
    {
      id: "orquidea-exemplo",
      name: "Conjunto Orquídea",
      description:
        "Peça de demonstração inspirada nas criações artesanais da Hosken. Valores, materiais e disponibilidade são ilustrativos.",
      priceCents: 15900,
      stock: 1,
      categoryId: "conjunto",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
      imageUrl: "",
    },
    {
      id: "colar-exemplo",
      name: "Colar Jardim",
      description:
        "Peça de demonstração para conhecer a loja. Valores, materiais e disponibilidade são ilustrativos.",
      priceCents: 8900,
      stock: 2,
      categoryId: "colar",
      collectionId: "biojoias",
      status: "published",
      availability: "available",
      imageUrl: "",
    },
  ] satisfies Product[],
  news: [
    {
      id: "bem-vindo",
      title: "Um novo espaço para florescer",
      body: "Estamos preparando a loja da Hosken. Em breve, você poderá conhecer as peças e os novos caminhos do ateliê.",
      status: "published",
    },
  ] satisfies Content[],
};

export function useRecords<T>(name: string, all = false) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setData([]);
    setLoading(true);
    setError("");
    if (publicPreview) {
      const records = (previewRecords[name] || []) as T[];
      setData(
        all
          ? records
          : records.filter(
              (record) =>
                (record as { status?: string }).status === "published",
            ),
      );
      setLoading(false);
      return;
    }

    const timer = setTimeout(
      () =>
        setError(
          "Leitura demorando. Confira se os emuladores estão rodando e execute npm run db:seed.",
        ),
      8000,
    );
    const ref = collection(db, name);
    const unsub = onSnapshot(
      all ? ref : query(ref, where("status", "==", "published")),
      (snapshot) => {
        clearTimeout(timer);
        setData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setError("");
        setLoading(false);
      },
      () => {
        clearTimeout(timer);
        setError(
          "Não foi possível acessar os dados. Confira sua conexão e as permissões.",
        );
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [name, all]);
  return { data, error, loading };
}
