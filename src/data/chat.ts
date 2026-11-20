import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
} from "firebase/storage";
import { auth, db, localMode, storage } from "../firebase";
import { convertToWebp } from "../utils/convertToWebp";
import { uploadFile } from "../utils/uploadFile";
import type { ChatConversation, ChatMessage } from "./models";

const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadConversationImage(
  conversationId: string,
  senderId: string,
  messageId: string,
  file: File,
) {
  if (!file.type.startsWith("image/") || file.size > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("invalid-chat-image");
  }
  const webp = await convertToWebp(file);
  if (webp.size > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("chat-image-too-large");
  }
  const suffix = Math.random().toString(36).slice(2, 10);
  const path = `conversations/${conversationId}/${senderId}/${messageId}-${Date.now()}-${suffix}.webp`;
  const target = storageRef(storage, path);
  await uploadFile(target, webp, { contentType: "image/webp" });
  try {
    return { imagePath: path, imageUrl: await getDownloadURL(target) };
  } catch (cause) {
    await deleteObject(target).catch(() => {});
    throw cause;
  }
}

function messagePreview(message: Pick<ChatMessage, "text" | "imageUrl">) {
  return message.text || (message.imageUrl ? "📷 Imagem" : "");
}

export function useCustomerConversation(uid: string | undefined) {
  const [data, setData] = useState<ChatConversation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(uid));
  const [serverReady, setServerReady] = useState(false);
  useEffect(() => {
    setData([]);
    setError("");
    setServerReady(false);
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
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as ChatConversation,
          ),
        );
        setServerReady(!snapshot.metadata.fromCache);
        setError("");
        setLoading(false);
      },
      (cause) => {
        if (import.meta.env.DEV)
          console.error("Chat conversation listener failed", cause);
        setServerReady(false);
        setError("Não foi possível carregar a conversa. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);
  return { conversation: data[0], error, loading, serverReady };
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
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs.map(
            (item) =>
              ({
                id: item.id,
                ...item.data({ serverTimestamps: "estimate" }),
              }) as ChatMessage,
          ),
        );
        setError("");
        setLoading(false);
      },
      (cause) => {
        if (import.meta.env.DEV)
          console.error("Chat message listener failed", cause);
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
  const conversationRef = doc(db, "conversations", uid);
  try {
    await setDoc(conversationRef, {
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
  } catch (cause) {
    try {
      const existing = await getDoc(conversationRef);
      if (existing.exists() && existing.data().customerId === uid) return;
    } catch {
      // Preserve the creation error if an existing conversation cannot be confirmed.
    }
    throw cause;
  }
}
export async function sendChatMessage(
  conversationId: string,
  senderId: string,
  senderRole: ChatMessage["senderRole"],
  text: string,
  imageFile?: File,
) {
  const cleanText = text.trim();
  if ((!cleanText && !imageFile) || cleanText.length > 2000) return;
  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(conversationRef, "messages"));
  const uploadedImage = imageFile
    ? await uploadConversationImage(
        conversationId,
        senderId,
        messageRef.id,
        imageFile,
      )
    : undefined;
  const preview = cleanText || "📷 Imagem";
  const currentUser = auth.currentUser;
  const diagnostics = {
    projectId: db.app.options.projectId,
    localMode,
    authUidMatchesSender: currentUser?.uid === senderId,
    conversationPathMatchesSender: conversationId === senderId,
    senderRole,
    messageLength: cleanText.length,
    messageId: messageRef.id,
    conversationFields: [
      "lastMessage",
      "lastMessageId",
      "lastMessageSenderRole",
      "updatedAt",
      senderRole === "customer" ? "unreadForAdmin" : "unreadForCustomer",
    ],
  };
  if (import.meta.env.DEV)
    console.info("[Hosken chat] tentativa de envio", diagnostics);
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    senderRole,
    text: cleanText,
    createdAt: serverTimestamp(),
    ...(uploadedImage || {}),
  });
  batch.update(conversationRef, {
    lastMessage: preview,
    lastMessageId: messageRef.id,
    lastMessageSenderRole: senderRole,
    updatedAt: serverTimestamp(),
    ...(senderRole === "customer"
      ? { unreadForAdmin: increment(1) }
      : { unreadForCustomer: increment(1) }),
  });
  try {
    await batch.commit();
  } catch (cause) {
    if (uploadedImage) {
      await deleteObject(storageRef(storage, uploadedImage.imagePath)).catch(
        () => {},
      );
    }
    if (import.meta.env.DEV) {
      console.error("[Hosken chat] batch de envio recusado", {
        ...diagnostics,
        errorCode:
          typeof cause === "object" && cause !== null && "code" in cause
            ? String(cause.code)
            : "desconhecido",
        errorMessage: cause instanceof Error ? cause.message : String(cause),
      });
    }
    throw cause;
  }
}
export async function markConversationRead(
  conversationId: string,
  readerRole: ChatMessage["senderRole"],
) {
  await updateDoc(
    doc(db, "conversations", conversationId),
    readerRole === "admin"
      ? { unreadForAdmin: 0, adminLastReadAt: serverTimestamp() }
      : { unreadForCustomer: 0, customerLastReadAt: serverTimestamp() },
  );
}
export async function editChatMessage(
  conversationId: string,
  message: ChatMessage,
  nextText: string,
  replacementImage?: File,
) {
  const cleanText = nextText.trim();
  if (
    (!cleanText && !replacementImage && !message.imageUrl) ||
    cleanText.length > 2000
  )
    throw new Error("Invalid message");
  const messageRef = doc(
    db,
    "conversations",
    conversationId,
    "messages",
    message.id,
  );
  const conversationRef = doc(db, "conversations", conversationId);
  const uploadedImage = replacementImage
    ? await uploadConversationImage(
        conversationId,
        message.senderId,
        message.id,
        replacementImage,
      )
    : undefined;
  const preview =
    cleanText || (uploadedImage || message.imageUrl ? "📷 Imagem" : "");
  try {
    await runTransaction(db, async (transaction) => {
      const conversationSnapshot = await transaction.get(conversationRef);
      const messageSnapshot = await transaction.get(messageRef);
      if (!conversationSnapshot.exists() || !messageSnapshot.exists()) {
        throw new Error("Chat message no longer exists");
      }

      transaction.update(messageRef, {
        text: cleanText,
        editedAt: serverTimestamp(),
        ...(uploadedImage || {}),
      });
      if (conversationSnapshot.data().lastMessageId === message.id) {
        transaction.update(conversationRef, {
          lastMessage: preview,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (cause) {
    if (uploadedImage) {
      await deleteObject(storageRef(storage, uploadedImage.imagePath)).catch(
        () => {},
      );
    }
    throw cause;
  }
  if (uploadedImage && message.imagePath) {
    await deleteObject(storageRef(storage, message.imagePath)).catch(
      (cause) => {
        if (import.meta.env.DEV)
          console.warn("Could not remove replaced chat image", cause);
      },
    );
  }
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
    updates.lastMessage = previousMessage
      ? messagePreview(previousMessage)
      : "";
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
  if (message.imagePath) {
    await deleteObject(storageRef(storage, message.imagePath)).catch(
      (cause) => {
        if (import.meta.env.DEV)
          console.warn("Could not remove deleted chat image", cause);
      },
    );
  }
}
