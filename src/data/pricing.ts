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

export function getProductTotalPriceCents(
  product:
    | Pick<
        Product,
        "priceCents" | "chainAddonPriceCents" | "withChainPriceCents"
      >
    | null
    | undefined,
  necklace: boolean,
) {
  if (!product) return 0;
  return necklace
    ? (getProductWithChainPriceCents(product) ?? product.priceCents)
    : product.priceCents;
}
