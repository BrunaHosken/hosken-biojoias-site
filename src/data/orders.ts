import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { CustomerOrder } from "./models";

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
    );
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(
          (snapshot) =>
            ({ id: snapshot.id, ...snapshot.data() }) as CustomerOrder,
        );
        orders.sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        );
        setData(orders);
        setError("");
        setLoading(false);
      },
      (cause) => {
        const code =
          typeof cause === "object" && cause !== null && "code" in cause
            ? String(cause.code)
            : "unknown";
        if (import.meta.env.DEV) {
          console.error("Customer orders listener failed", {
            code,
            message: cause instanceof Error ? cause.message : String(cause),
            uid,
            projectId: db.app.options.projectId,
          });
        }
        setError(
          code === "permission-denied"
            ? "Não foi possível acessar os pedidos desta conta. Saia e entre novamente."
            : "Não foi possível carregar seus pedidos. Tente novamente.",
        );
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
    const ordersQuery = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(
          (snapshot) =>
            ({ id: snapshot.id, ...snapshot.data() }) as CustomerOrder,
        );
        orders.sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        );
        setData(orders);
        setError("");
        setLoading(false);
      },
      (cause) => {
        if (import.meta.env.DEV) {
          const code =
            typeof cause === "object" && cause !== null && "code" in cause
              ? String(cause.code)
              : "unknown";
          console.error("Admin orders listener failed", {
            code,
            message: cause instanceof Error ? cause.message : String(cause),
            projectId: db.app.options.projectId,
          });
        }
        setError("Não foi possível carregar os pedidos. Tente novamente.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);
  return { data, error, loading };
}
