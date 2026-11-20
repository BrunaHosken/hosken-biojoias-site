export type BasketSelection = {
  productId: string;
  variantId: string;
  withChain: boolean;
};

const SEPARATOR = "::";

export function makeBasketItemId(
  productId: string,
  variantId = "",
) {
  return `${productId}${SEPARATOR}${variantId}`;
}

export function parseBasketItemId(id: string): BasketSelection {
  const [productId, variantId, chainOption] = id.split(SEPARATOR);
  if (chainOption === undefined) {
    return { productId, variantId: variantId || "", withChain: false };
  }
  if (chainOption !== "chain" && chainOption !== "pendant") {
    return { productId: id, variantId: "", withChain: false };
  }
  return {
    productId,
    variantId: variantId || "",
    withChain: chainOption === "chain",
  };
}

export function normalizeBasketItems(items: Record<string, number>) {
  return Object.entries(items).reduce<Record<string, number>>(
    (normalized, [id, quantity]) => {
      const { productId, variantId } = parseBasketItemId(id);
      const normalizedId = makeBasketItemId(productId, variantId);
      normalized[normalizedId] = Math.min(
        99,
        (normalized[normalizedId] || 0) + quantity,
      );
      return normalized;
    },
  {});
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
