import type { Timestamp } from "firebase/firestore";

export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  imageUrls?: string[];
  imagePaths?: string[];
};
export type ProductColorVariant = {
  colorId: string;
  colorName: string;
  stock: number;
};
export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  colorVariants?: ProductColorVariant[];
  /** Additional cost added to the piece price for the chain option. */
  chainAddonPriceCents?: number;
  /** Legacy total price with chain, kept for existing catalog records. */
  withChainPriceCents?: number;
  lowStockThreshold?: number;
  categoryId: string;
  collectionId: string;
  status: string;
  availability: string;
  imageUrl: string;
  imageUrls?: string[];
  imagePaths?: string[];
  materials?: string;
  dimensions?: string;
  careInstructions?: string;
};
export type ProductShippingData = {
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
  packageWeightGrams: number;
  pieceWeightGrams?: number;
};
export type AddressDetails = {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};
export type SavedAddress = AddressDetails & {
  id: string;
  label: string;
};
export type Content = {
  id: string;
  title: string;
  body: string;
  status: string;
  eventSchedule?: EventScheduleEntry[];
  eventDate?: string;
  eventTime?: string;
  location?: string;
  address?: string;
  mapUrl?: string;
  partnerType?: "partner_store" | "physical_store";
  policyType?: string;
};
export type EventScheduleEntry = { date: string; time: string };
export type OrderItem = {
  productId: string;
  variantId?: string;
  colorName?: string;
  withChain?: boolean;
  customQuoteId?: string;
  customConversationId?: string;
  categoryName?: string;
  customDescription?: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};
export type CustomerOrder = {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderNumber?: string;
  items: OrderItem[];
  totalCents: number;
  status: string;
  paymentStatus?: string;
  notificationEligible?: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  trackingCode?: string;
  isDemo?: boolean;
  paymentMethod?: "credit_card" | "pix" | string;
  installments?: number;
  deliveryMethod?: "sedex" | "pickup" | string;
  deliveryAddress?: string;
  reservationStatus?:
    "active" | "released" | "committed" | "not_applicable" | string;
  stockReserved?: boolean;
};
export type ChatConversation = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: "open" | "closed";
  lastMessage: string;
  lastMessageId: string;
  lastMessageSenderRole: "customer" | "admin" | "";
  lastDeletedMessageId: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
  adminLastReadAt: Timestamp;
  customerLastReadAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: "customer" | "admin";
  text: string;
  imageUrl?: string;
  imagePath?: string;
  createdAt?: Timestamp;
  editedAt?: Timestamp;
};
export type CustomQuote = {
  id: string;
  customerId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  colorIds: string[];
  colorNames: Record<string, string>;
  basePriceCents: number;
  chainAddonPriceCents?: number;
  status: "offered" | "accepted" | "ordered";
  selectedColorId?: string;
  withChain?: boolean;
  orderId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
