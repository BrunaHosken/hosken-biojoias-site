import type { Product } from "./models";

const STOCK_AVAILABILITY = new Set(["available", "soldout"]);

export function availabilityFromStock(stock: number) {
  return stock > 0 ? "available" : "soldout";
}

export function getProductAvailability(
  product: Pick<Product, "availability" | "stock">,
) {
  if (STOCK_AVAILABILITY.has(product.availability)) {
    return availabilityFromStock(product.stock);
  }
  return product.availability;
}

export function isProductAvailable(
  product: Pick<Product, "availability" | "stock">,
) {
  return getProductAvailability(product) === "available" && product.stock > 0;
}
