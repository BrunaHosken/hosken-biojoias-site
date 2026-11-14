import { useEffect, useState } from "react";
import {
  collection,
  doc,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  status: string;
};
export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  categoryId: string;
  collectionId: string;
  status: string;
  availability: string;
  imageUrl: string;
};
export type Content = {
  id: string;
  title: string;
  body: string;
  status: string;
};
export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};
export type CustomerOrder = {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string;
  items: OrderItem[];
  totalCents: number;
  status: string;
  paymentStatus?: string;
  createdAt: Timestamp;
  trackingCode?: string;
  isDemo?: boolean;
};
export type ChatConversation = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: "open" | "closed";
  lastMessage: string;
  lastMessageId: string;
  lastMessageSenderRole: "customer" | "admin" | "";
  lastDeletedMessageId: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
  adminLastReadAt: Timestamp;
  customerLastReadAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: "customer" | "admin";
  text: string;
  createdAt?: Timestamp;
  editedAt?: Timestamp;
};
export function useRecords<T>(name: string, all = false) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setData([]);
    setLoading(true);
    setError("");
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
export function useCustomerOrders(uid: string | undefined) {
  const [data, setData] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(uid));
  useEffect(() => {
    setData([]);
    setError("");
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (snapshot) =>
              ({ id: snapshot.id, ...snapshot.data() }) as CustomerOrder,
          ),
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar seus pedidos. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);
  return { data, error, loading };
}
export function useAdminOrders() {
  const [data, setData] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (snapshot) =>
              ({ id: snapshot.id, ...snapshot.data() }) as CustomerOrder,
          ),
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar os pedidos. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);
  return { data, error, loading };
}
export function useCustomerConversation(uid: string | undefined) {
  const [data, setData] = useState<ChatConversation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(uid));
  useEffect(() => {
    setData([]);
    setError("");
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const conversationQuery = query(
      collection(db, "conversations"),
      where("customerId", "==", uid),
    );
    const unsubscribe = onSnapshot(
      conversationQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as ChatConversation,
          ),
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar a conversa. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);
  return { conversation: data[0], error, loading };
}
export function useAdminConversations(enabled = true) {
  const [data, setData] = useState<ChatConversation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) {
      setData([]);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const conversationsQuery = query(
      collection(db, "conversations"),
      orderBy("updatedAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as ChatConversation,
          ),
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar os atendimentos. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [enabled]);
  return { data, error, loading };
}
export function useConversationMessages(conversationId: string | undefined) {
  const [data, setData] = useState<ChatMessage[]>([]);
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
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
      limitToLast(200),
    );
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as ChatMessage,
          ),
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as mensagens. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [conversationId]);
  return { data, error, loading };
}
export async function createCustomerConversation(
  uid: string,
  customerName: string,
  customerEmail: string,
) {
  await setDoc(doc(db, "conversations", uid), {
    customerId: uid,
    customerName: customerName.trim().slice(0, 100) || "Cliente",
    customerEmail: customerEmail.trim().slice(0, 254),
    status: "open",
    lastMessage: "",
    lastMessageId: "",
    lastMessageSenderRole: "",
    lastDeletedMessageId: "",
    unreadForAdmin: 0,
    unreadForCustomer: 0,
    adminLastReadAt: serverTimestamp(),
    customerLastReadAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function sendChatMessage(
  conversationId: string,
  senderId: string,
  senderRole: ChatMessage["senderRole"],
  text: string,
) {
  const cleanText = text.trim();
  if (!cleanText || cleanText.length > 2000) return;
  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(conversationRef, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    senderRole,
    text: cleanText,
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    lastMessage: cleanText,
    lastMessageId: messageRef.id,
    lastMessageSenderRole: senderRole,
    updatedAt: serverTimestamp(),
    ...(senderRole === "customer"
      ? { unreadForAdmin: increment(1) }
      : { unreadForCustomer: increment(1) }),
  });
  await batch.commit();
}
export async function markConversationRead(
  conversationId: string,
  readerRole: ChatMessage["senderRole"],
) {
  await updateDoc(doc(db, "conversations", conversationId),
    readerRole === "admin"
      ? { unreadForAdmin: 0, adminLastReadAt: serverTimestamp() }
      : { unreadForCustomer: 0, customerLastReadAt: serverTimestamp() },
  );
}
export async function editChatMessage(
  conversationId: string,
  message: ChatMessage,
  nextText: string,
  isLatest: boolean,
) {
  const cleanText = nextText.trim();
  if (!cleanText || cleanText.length > 2000) throw new Error("Invalid message");
  const messageRef = doc(db, "conversations", conversationId, "messages", message.id);
  const updatedMessage = { text: cleanText, editedAt: serverTimestamp() };
  if (!isLatest) {
    await updateDoc(messageRef, updatedMessage);
    return;
  }
  const batch = writeBatch(db);
  batch.update(messageRef, updatedMessage);
  batch.update(doc(db, "conversations", conversationId), {
    lastMessage: cleanText,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
export async function deleteChatMessage(
  conversation: ChatConversation,
  message: ChatMessage,
  previousMessage?: ChatMessage,
) {
  const conversationRef = doc(db, "conversations", conversation.id);
  const batch = writeBatch(db);
  batch.delete(
    doc(db, "conversations", conversation.id, "messages", message.id),
  );
  const updates: Record<string, unknown> = {
    lastDeletedMessageId: message.id,
  };
  if (conversation.lastMessageId === message.id) {
    updates.lastMessage = previousMessage?.text || "";
    updates.lastMessageId = previousMessage?.id || "";
    updates.lastMessageSenderRole = previousMessage?.senderRole || "";
    updates.updatedAt = serverTimestamp();
  }
  if (message.createdAt && message.senderRole === "customer") {
    if (
      conversation.unreadForAdmin > 0 &&
      message.createdAt.toMillis() > conversation.adminLastReadAt.toMillis()
    )
      updates.unreadForAdmin = increment(-1);
  } else if (message.createdAt && message.senderRole === "admin") {
    if (
      conversation.unreadForCustomer > 0 &&
      message.createdAt.toMillis() > conversation.customerLastReadAt.toMillis()
    )
      updates.unreadForCustomer = increment(-1);
  }
  batch.update(conversationRef, updates);
  await batch.commit();
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
