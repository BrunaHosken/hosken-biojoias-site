import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import type { AddressDetails, CustomerOrder } from "./models";

export type CreateDemoOrderInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  customQuoteId?: string;
  conversationId?: string;
  deliveryMethod: "sedex" | "pickup";
  pickupAgreed: boolean;
  address?: AddressDetails;
  paymentMethod: "credit_card" | "debit_card" | "pix";
  installments: number;
  isGift: boolean;
  giftMessage?: string;
  paymentStatus: "simulated_paid" | "pending";
  expectedTotalCents: number;
};

export type DemoOrderResult = {
  id: string;
  orderNumber: string;
  totalCents: number;
  alreadyExists: boolean;
};

const createDemoOrderCall = httpsCallable<
  CreateDemoOrderInput,
  DemoOrderResult
>(functions, "createDemoOrder");
const cancelDemoOrderCall = httpsCallable<
  { orderId: string },
  { id: string; alreadyCancelled: boolean }
>(functions, "cancelDemoOrder");

export async function createDemoOrder(input: CreateDemoOrderInput) {
  return (await createDemoOrderCall(input)).data;
}

export async function cancelDemoOrder(orderId: string) {
  return (await cancelDemoOrderCall({ orderId })).data;
}

export function getCheckoutErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code.endsWith("/failed-precondition")) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";
    if (message.includes("pickup-not-confirmed")) {
      return "Confirme que já combinou a retirada com a artesã.";
    }
    if (
      message.includes("stock-changed") ||
      message.includes("product-unavailable")
    ) {
      return "O estoque mudou enquanto você finalizava. Confira a sacola e tente novamente.";
    }
    if (
      message.includes("color-required") ||
      message.includes("color-unavailable")
    ) {
      return "A cor escolhida não está mais disponível. Volte à peça e escolha outra cor.";
    }
    if (message.includes("chain-option-unavailable")) {
      return "A opção com corrente não está disponível para esta peça. Confira a sacola e tente novamente.";
    }
    if (message.includes("price-changed")) {
      return "O preço de uma peça mudou durante a compra. Confira o novo total antes de continuar.";
    }
    if (message.includes("custom-quote")) {
      return "Esta proposta personalizada foi alterada ou já foi usada. Volte ao chat para conferir a versão atual.";
    }
    return "Este pedido não pode ser concluído. Confira os dados e tente novamente.";
  }
  if (code.endsWith("/unauthenticated")) {
    return "Sua sessão expirou. Entre novamente para concluir o pedido.";
  }
  if (code.endsWith("/already-exists")) {
    return "Este pedido já foi registrado. Confira Meus pedidos antes de tentar novamente.";
  }
  if (code.endsWith("/permission-denied")) {
    return "Esta conta não está autorizada a fazer compras de demonstração.";
  }
  return "Não foi possível concluir o pedido de demonstração. Tente novamente.";
}

export function canCancelDemoOrder(order: CustomerOrder) {
  const customOnlyOrder =
    order.items.length > 0 &&
    order.items.every(
      (item) => item.productId === "custom" && Boolean(item.customQuoteId),
    );
  return (
    order.isDemo === true &&
    ((order.stockReserved !== false && order.reservationStatus === "active") ||
      (order.stockReserved === false &&
        order.reservationStatus === "not_applicable" &&
        customOnlyOrder)) &&
    ["pending_payment", "confirmed", "preparing", "cancelled"].includes(
      order.status,
    )
  );
}
