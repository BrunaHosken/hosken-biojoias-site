import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type CustomerProfile = {
  displayName?: string;
  phone?: string;
};

export function useCustomerProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<CustomerProfile>({});
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile({});
    setError("");
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        setProfile(
          snapshot.exists() ? (snapshot.data() as CustomerProfile) : {},
        );
        setLoading(false);
        setError("");
      },
      () => {
        setError("Não foi possível carregar os dados da conta.");
        setLoading(false);
      },
    );
  }, [uid]);

  return { profile, loading, error };
}
