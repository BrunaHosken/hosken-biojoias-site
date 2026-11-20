export type BasketSelection = {
  productId: string;
  variantId: string;
  withChain: boolean;
};

const SEPARATOR = "::";

export function makeBasketItemId(
  productId: string,
  variantId = "",
  withChain = false,
) {
  return `${productId}${SEPARATOR}${variantId}${SEPARATOR}${withChain ? "chain" : "pendant"}`;
}

export function parseBasketItemId(id: string): BasketSelection {
  const [productId, variantId, chainOption] = id.split(SEPARATOR);
  if (chainOption !== "chain" && chainOption !== "pendant") {
    return { productId: id, variantId: "", withChain: false };
  }
  return {
    productId,
    variantId: variantId || "",
    withChain: chainOption === "chain",
  };
}

export function getBasketQuantityForVariant(
  items: Record<string, number>,
  productId: string,
  variantId: string,
) {
  return Object.entries(items).reduce((total, [id, quantity]) => {
    const selection = parseBasketItemId(id);
    return selection.productId === productId &&
      selection.variantId === variantId
      ? total + quantity
      : total;
  }, 0);
}
