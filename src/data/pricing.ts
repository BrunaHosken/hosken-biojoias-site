import type { Product } from "./models";

export function getProductWithChainPriceCents(
  product:
    | Pick<
        Product,
        "priceCents" | "chainAddonPriceCents" | "withChainPriceCents"
      >
    | null
    | undefined,
) {
  if (!product) return undefined;
  if (product.chainAddonPriceCents !== undefined) {
    return product.priceCents + product.chainAddonPriceCents;
  }
  return product.withChainPriceCents;
}
