import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type QueryFieldFilterConstraint,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { ProductReview, PublicProductReview, ReviewPhoto } from "./models";

function useReviewCollection<T>(
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
    const unsubscribe = onSnapshot(
      target,
      (snapshot) => {
        setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as avaliações.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [collectionName, key, enabled]);
  return { data, error, loading };
}

export function useCustomerReviews(uid: string | undefined) {
  return useReviewCollection<ProductReview>(
    "reviews",
    uid ? [where("customerId", "==", uid)] : [],
    uid || "signed-out",
    Boolean(uid),
  );
}

export function useAdminReviews() {
  return useReviewCollection<ProductReview>("reviews", [], "all");
}

export function useProductReviews(productId: string | undefined) {
  return useReviewCollection<PublicProductReview>(
    "publicReviews",
    productId ? [where("productId", "==", productId)] : [],
    productId || "no-product",
    Boolean(productId),
  );
}

export type ProductReviewsResult = ReturnType<typeof useProductReviews>;

export function useFeaturedReviews() {
  return useReviewCollection<PublicProductReview>("publicReviews", [
    where("featuredHome", "==", true),
  ], "featured");
}

export type HomepageReviewSettings = { homepageLimit: number };

export function useHomepageReviewSettings() {
  const [homepageLimit, setHomepageLimit] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "siteSettings", "reviews"),
      (snapshot) => {
        const value = snapshot.data()?.homepageLimit;
        setHomepageLimit(
          Number.isInteger(value) && value > 0 && value <= 30 ? value : 5,
        );
        setError("");
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as configurações das avaliações.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);
  return { homepageLimit, error, loading };
}

export type SubmitProductReviewInput = {
  orderId: string;
  itemIndex: number;
  rating: number;
  text: string;
  anonymous: boolean;
  photos: ReviewPhoto[];
};

export type UpdateProductReviewInput = Omit<SubmitProductReviewInput, "orderId" | "itemIndex"> & {
  orderId: string;
  itemIndex: number;
};

const submitReviewCall = httpsCallable<SubmitProductReviewInput, { id: string }>(
  functions,
  "submitProductReview",
);
const setReviewFeaturedCall = httpsCallable<
  { reviewId: string; featuredHome: boolean },
  { featuredHome: boolean }
>(functions, "setReviewFeatured");
const setHomepageReviewLimitCall = httpsCallable<
  { homepageLimit: number },
  HomepageReviewSettings
>(functions, "setHomepageReviewLimit");
const updateReviewCall = httpsCallable<
  UpdateProductReviewInput,
  { id: string }
>(functions, "updateProductReview");

export async function submitProductReview(input: SubmitProductReviewInput) {
  return (await submitReviewCall(input)).data;
}

export async function setReviewFeatured(reviewId: string, featuredHome: boolean) {
  return (await setReviewFeaturedCall({ reviewId, featuredHome })).data;
}

export async function setHomepageReviewLimit(homepageLimit: number) {
  return (await setHomepageReviewLimitCall({ homepageLimit })).data;
}

export async function updateProductReview(input: UpdateProductReviewInput) {
  return (await updateReviewCall(input)).data;
}
