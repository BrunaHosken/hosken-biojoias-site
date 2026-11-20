import { useEffect, useState } from "react";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { CustomQuote } from "./models";

export type CustomQuoteDraft = {
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  colorIds: string[];
  colorNames: Record<string, string>;
  basePriceCents: number;
  chainAddonPriceCents?: number;
};

export function useConversationQuotes(conversationId: string | undefined) {
  const [data, setData] = useState<CustomQuote[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(conversationId));

  useEffect(() => {
    setData([]);
    setError("");
    if (!conversationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const quotesQuery = query(
      collection(db, "conversations", conversationId, "quotes"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      quotesQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) =>
              ({
                id: item.id,
                ...item.data({ serverTimestamps: "estimate" }),
              }) as CustomQuote,
          ),
        );
        setError("");
        setLoading(false);
      },
      (cause) => {
        if (import.meta.env.DEV)
          console.error("Custom quote listener failed", cause);
        setError("Não foi possível carregar as propostas deste atendimento.");
        setLoading(false);
      },
    );
  }, [conversationId]);

  return { data, error, loading };
}

export async function createCustomQuote(
  conversationId: string,
  adminId: string,
  quote: CustomQuoteDraft,
) {
  const quoteRef = doc(
    collection(db, "conversations", conversationId, "quotes"),
  );
  const messageRef = doc(
    collection(db, "conversations", conversationId, "messages"),
  );
  const conversationRef = doc(db, "conversations", conversationId);
  const messageText = `A artesã enviou uma proposta para “${quote.title}”. Confira os detalhes e escolhas aqui no chat.`;
  const batch = writeBatch(db);
  batch.set(quoteRef, {
    ...quote,
    customerId: conversationId,
    status: "offered",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(messageRef, {
    senderId: adminId,
    senderRole: "admin",
    text: messageText,
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    lastMessage: messageText,
    lastMessageId: messageRef.id,
    lastMessageSenderRole: "admin",
    unreadForCustomer: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return quoteRef.id;
}

export async function acceptCustomQuote(
  conversationId: string,
  quoteId: string,
  customerId: string,
  selectedColorId: string,
  withChain: boolean,
) {
  const quoteRef = doc(db, "conversations", conversationId, "quotes", quoteId);
  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(
    collection(db, "conversations", conversationId, "messages"),
  );

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(quoteRef);
    if (!snapshot.exists()) throw new Error("custom-quote-not-found");
    const quote = snapshot.data() as Omit<CustomQuote, "id">;
    if (quote.customerId !== customerId) throw new Error("permission-denied");
    if (quote.status !== "offered")
      throw new Error("custom-quote-no-longer-available");

    const colorIds = Array.isArray(quote.colorIds) ? quote.colorIds : [];
    if (colorIds.length && !colorIds.includes(selectedColorId))
      throw new Error("custom-quote-color-required");
    if (!colorIds.length && selectedColorId)
      throw new Error("custom-quote-color-unavailable");
    if (withChain && quote.chainAddonPriceCents === undefined)
      throw new Error("custom-quote-chain-unavailable");

    const selectedColorName = selectedColorId
      ? quote.colorNames?.[selectedColorId]
      : "";
    const selectedOptions = [
      selectedColorName ? `na cor ${selectedColorName}` : "",
      withChain ? "com corrente" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const messageText = `Aceitei a proposta “${quote.title}”${selectedOptions ? ` ${selectedOptions}` : ""}. Vou continuar para o checkout.`;

    transaction.update(quoteRef, {
      status: "accepted",
      ...(selectedColorId ? { selectedColorId } : {}),
      withChain: Boolean(withChain),
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(messageRef, {
      senderId: customerId,
      senderRole: "customer",
      text: messageText,
      createdAt: serverTimestamp(),
    });
    transaction.update(conversationRef, {
      lastMessage: messageText,
      lastMessageId: messageRef.id,
      lastMessageSenderRole: "customer",
      unreadForAdmin: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}
