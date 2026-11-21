import type { Product, Taxonomy } from "./models";

/** Returns the product as it may be sold with currently published catalog data. */
export function getStorefrontProduct(
  product: Product,
  categories: Taxonomy[],
  collections: Taxonomy[],
  colors: Taxonomy[],
): Product | undefined {
  const category = categories.find((item) => item.id === product.categoryId);
  const line = collections.find((item) => item.id === product.collectionId);
  if (
    product.status !== "published" ||
    category?.status !== "published" ||
    line?.status !== "published"
  ) {
    return undefined;
  }

  if (!product.colorVariants?.length) return product;

  const publishedColorIds = new Set(
    colors
      .filter((color) => color.status === "published")
      .map((color) => color.id),
  );
  const colorVariants = product.colorVariants.filter((variant) =>
    publishedColorIds.has(variant.colorId),
  );
  const stock = colorVariants.reduce(
    (total, variant) => total + variant.stock,
    0,
  );
  const availability =
    product.availability === "available" || product.availability === "soldout"
      ? stock > 0
        ? "available"
        : "soldout"
      : product.availability;

  return { ...product, colorVariants, stock, availability };
}
