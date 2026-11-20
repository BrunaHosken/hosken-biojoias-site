import type { Product, Taxonomy } from "./models";

const STOCK_AVAILABILITY = new Set(["available", "soldout"]);

export function isNecklaceCategory(
  category: Pick<Taxonomy, "name" | "slug"> | undefined,
) {
  const label = `${category?.name || ""} ${category?.slug || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[-_]+/g, " ");
  return /\b(colar|colares)\b/.test(label);
}

export function availabilityFromStock(stock: number) {
  return stock > 0 ? "available" : "soldout";
}

export function getProductStock(
  product: Pick<Product, "stock" | "colorVariants">,
) {
  return product.colorVariants?.length
    ? product.colorVariants.reduce(
        (total, variant) =>
          total + (Number.isSafeInteger(variant.stock) ? variant.stock : 0),
        0,
      )
    : product.stock;
}

export function getProductAvailability(
  product: Pick<Product, "availability" | "stock" | "colorVariants">,
) {
  if (STOCK_AVAILABILITY.has(product.availability)) {
    return availabilityFromStock(getProductStock(product));
  }
  return product.availability;
}

export function isProductAvailable(
  product: Pick<Product, "availability" | "stock" | "colorVariants">,
) {
  return (
    getProductAvailability(product) === "available" &&
    getProductStock(product) > 0
  );
}
