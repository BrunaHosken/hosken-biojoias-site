import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type QueryFieldFilterConstraint,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { PublicTestimonial, ReviewPhoto, Testimonial } from "./models";

function useTestimonialCollection<T>(
  collectionName: string,
  constraints: QueryFieldFilterConstraint[],
  key: string,
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setData([]);
    setLoading(true);
    setError("");
    if (!enabled) {
      setLoading(false);
      return;
    }
    const source = collection(db, collectionName);
    const target = constraints.length ? query(source, ...constraints) : source;
    return onSnapshot(
      target,
      (snapshot) => {
        setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        if (snapshotError.code === "permission-denied") {
          setError(
            "A conta atual não tem permissão para carregar os depoimentos. Confirme o acesso de administradora e as regras do Firestore.",
          );
        } else if (snapshotError.code === "unavailable") {
          setError(
            "O Firestore está indisponível. Verifique a conexão ou se o emulador está ativo.",
          );
        } else {
          setError("Não foi possível carregar os depoimentos.");
        }
        setLoading(false);
      },
    );
  }, [collectionName, key, enabled]);
  return { data, error, loading };
}

export function useMyTestimonial(uid: string | undefined) {
  const [data, setData] = useState<Testimonial | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setData(null);
    setLoading(true);
    setError("");
    if (!uid) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, "testimonials", uid),
      (snapshot) => {
        setData(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Testimonial) : null);
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar seu depoimento.");
        setLoading(false);
      },
    );
  }, [uid]);
  return { data, error, loading };
}

export function useAdminTestimonials() {
  return useTestimonialCollection<Testimonial>("testimonials", [], "all");
}

export function useFeaturedTestimonials() {
  return useTestimonialCollection<PublicTestimonial>(
    "publicTestimonials",
    [where("featuredHome", "==", true)],
    "featured",
  );
}

export type HomepageTestimonialSettings = { homepageLimit: number };

export function useHomepageTestimonialSettings() {
  const [homepageLimit, setHomepageLimit] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() =>
    onSnapshot(
      doc(db, "siteSettings", "testimonials"),
      (snapshot) => {
        const value = snapshot.data()?.homepageLimit;
        setHomepageLimit(Number.isInteger(value) && value > 0 && value <= 30 ? value : 5);
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as configurações dos depoimentos.");
        setLoading(false);
      },
    ),
  []);
  return { homepageLimit, error, loading };
}

const submitTestimonialCall = httpsCallable<
  { text: string; anonymous: boolean },
  { id: string; created: boolean }
>(functions, "submitTestimonial");
const setTestimonialFeaturedCall = httpsCallable<
  { testimonialId: string; featuredHome: boolean },
  { featuredHome: boolean }
>(functions, "setTestimonialFeatured");
const setHomepageTestimonialLimitCall = httpsCallable<
  { homepageLimit: number },
  HomepageTestimonialSettings
>(functions, "setHomepageTestimonialLimit");

export async function submitTestimonial(input: {
  text: string;
  anonymous: boolean;
  photo?: ReviewPhoto | null;
}) {
  return (await submitTestimonialCall(input)).data;
}

export async function deleteTestimonial(uid: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "testimonials", uid));
  batch.delete(doc(db, "publicTestimonials", uid));
  await batch.commit();
}

export async function setTestimonialFeatured(
  testimonialId: string,
  featuredHome: boolean,
) {
  return (await setTestimonialFeaturedCall({ testimonialId, featuredHome })).data;
}

export async function setHomepageTestimonialLimit(homepageLimit: number) {
  return (await setHomepageTestimonialLimitCall({ homepageLimit })).data;
}
