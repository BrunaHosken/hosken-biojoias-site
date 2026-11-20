import type { Product } from "../../data/models";

export type DeliveryMethod = "sedex" | "pickup";
export type CheckoutPaymentMethod = "credit_card" | "pix";
export type CheckoutContact = {
  name: string;
  email: string;
  phone: string;
};
export type CheckoutAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};
export type CheckoutDraft = {
  step: 1 | 2;
  orderId?: string;
  deliveryMethod: DeliveryMethod;
  pickupAgreed: boolean;
  contact: CheckoutContact;
  address: CheckoutAddress;
};
export type CheckoutLine = {
  productId: string;
  quantity: number;
  product: Product | undefined;
};

export const DEMO_INSTALLMENT_RATE = 0.02;

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

export function checkoutDraftStorageKey(uid: string) {
  return `hosken-checkout-draft:${uid}`;
}

export function loadCheckoutDraft(
  uid: string,
  name: string,
  email: string,
): CheckoutDraft {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(checkoutDraftStorageKey(uid)) || "null",
    ) as Partial<CheckoutDraft> | null;
    if (!saved || !saved.contact || !saved.address)
      return emptyCheckoutDraft(name, email);
    return {
      ...emptyCheckoutDraft(name, email),
      ...saved,
      contact: { ...emptyCheckoutDraft(name, email).contact, ...saved.contact },
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
