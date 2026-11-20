import type { AddressDetails, Product } from "../../data/models";

export type DeliveryMethod = "sedex" | "pickup";
export type CheckoutPaymentMethod = "credit_card" | "pix";
export type CheckoutContact = {
  name: string;
  email: string;
  phone: string;
};
export type CheckoutAddress = AddressDetails;
export type CheckoutDraft = {
  step: 1 | 2;
  orderId?: string;
  deliveryMethod: DeliveryMethod;
  pickupAgreed: boolean;
  contact: CheckoutContact;
  address: CheckoutAddress;
};
export type CheckoutLine = {
  basketItemId: string;
  productId: string;
  variantId: string;
  colorName?: string;
  withChain: boolean;
  chainOptionAvailable: boolean;
  unitPriceCents: number;
  quantity: number;
  product: Product | undefined;
  displayName?: string;
  categoryName?: string;
  customDescription?: string;
  customQuoteId?: string;
};

export const DEMO_INSTALLMENT_RATE = 0.02;

export function formatBrazilianMobile(value: string) {
  const rawDigits = value.replace(/\D/g, "");
  const digits = (
    rawDigits.startsWith("55") && [12, 13].includes(rawDigits.length)
      ? rawDigits.slice(2)
      : rawDigits
  ).slice(0, 11);
  if (!digits) return "";

  const areaCode = digits.slice(0, 2);
  if (digits.length <= 2)
    return digits.length === 2 ? `(${areaCode})` : `(${areaCode}`;

  const number = digits.slice(2);
  if (number.length <= 5) return `(${areaCode}) ${number}`;
  return `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function emptyCheckoutDraft(name = "", email = ""): CheckoutDraft {
  return {
    step: 1,
    deliveryMethod: "sedex",
    pickupAgreed: false,
    contact: { name, email, phone: "" },
    address: {
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  };
}

export function checkoutDraftStorageKey(uid: string, customQuoteId = "") {
  return customQuoteId
    ? `hosken-checkout-draft:${uid}:custom:${customQuoteId}`
    : `hosken-checkout-draft:${uid}`;
}

export function loadCheckoutDraft(
  uid: string,
  name: string,
  email: string,
  customQuoteId = "",
): CheckoutDraft {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(checkoutDraftStorageKey(uid, customQuoteId)) ||
        "null",
    ) as Partial<CheckoutDraft> | null;
    if (!saved || !saved.contact || !saved.address)
      return emptyCheckoutDraft(name, email);
    return {
      ...emptyCheckoutDraft(name, email),
      ...saved,
      contact: {
        ...emptyCheckoutDraft(name, email).contact,
        ...saved.contact,
        phone: formatBrazilianMobile(saved.contact.phone || ""),
      },
      address: { ...emptyCheckoutDraft(name, email).address, ...saved.address },
      step: saved.step === 2 ? 2 : 1,
      orderId:
        typeof saved.orderId === "string" &&
        /^[A-Za-z0-9_-]{1,80}$/.test(saved.orderId)
          ? saved.orderId
          : undefined,
      deliveryMethod: saved.deliveryMethod === "pickup" ? "pickup" : "sedex",
      pickupAgreed: saved.pickupAgreed === true,
    };
  } catch {
    return emptyCheckoutDraft(name, email);
  }
}
