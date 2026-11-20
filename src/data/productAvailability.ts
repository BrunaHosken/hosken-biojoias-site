import type { Product } from "./models";

const STOCK_AVAILABILITY = new Set(["available", "soldout"]);

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
