import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import type { Product } from "../../data";

export type ProductDraft = Omit<Product, "id">;

export const blankProduct: ProductDraft = {
  name: "",
  description: "",
  priceCents: 0,
  stock: 0,
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  categoryId: "",
  collectionId: "",
  status: "draft",
  availability: "soldout",
  imageUrl: "",
  imageUrls: [] as string[],
  imagePaths: [] as string[],
  materials: "",
  dimensions: "",
  careInstructions: "",
};
