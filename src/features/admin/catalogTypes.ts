export type AdminCatalogTab =
  | "products"
  | "categories"
  | "collections"
  | "news"
  | "events"
  | "partnerStores"
  | "policies";

export type AdminContentTab = Exclude<AdminCatalogTab, "products">;
