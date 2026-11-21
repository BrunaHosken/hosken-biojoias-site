export type AdminCatalogTab =
  | "products"
  | "categories"
  | "collections"
  | "colors"
  | "news"
  | "events"
  | "partnerStores"
  | "policies"
  | "faqs";

export type AdminContentTab = Exclude<AdminCatalogTab, "products">;
