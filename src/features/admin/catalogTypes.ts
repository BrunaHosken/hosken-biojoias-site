export type AdminCatalogTab =
  | "products"
  | "categories"
  | "collections"
  | "colors"
  | "news"
  | "events"
  | "partnerStores"
  | "policies";

export type AdminContentTab = Exclude<AdminCatalogTab, "products">;
