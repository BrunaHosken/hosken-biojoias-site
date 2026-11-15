import type { Product } from "../../data";

export function getProductImages(
  product: Pick<Product, "imageUrls" | "imageUrl">,
) {
  return Array.from(
    new Set(
      [...(product.imageUrls || []), product.imageUrl || ""].filter(Boolean),
    ),
  ).slice(0, 6);
}
