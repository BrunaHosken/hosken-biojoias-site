import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
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
