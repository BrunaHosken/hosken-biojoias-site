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
export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
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
  policyType?: string;
};
export type EventScheduleEntry = { date: string; time: string };
export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};
export type CustomerOrder = {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string;
  items: OrderItem[];
  totalCents: number;
  status: string;
  paymentStatus?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  trackingCode?: string;
  isDemo?: boolean;
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
