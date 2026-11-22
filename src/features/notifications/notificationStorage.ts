export const ADMIN_SEEN_ORDERS = "hosken-admin-seen-orders";
export const ADMIN_SEEN_DELIVERIES = "hosken-admin-seen-deliveries";
export const ADMIN_SEEN_CONVERSATIONS = "hosken-admin-seen-conversations";
export const ADMIN_SEEN_REVIEWS = "hosken-admin-seen-reviews";
export const ADMIN_NOTIFICATIONS_EVENT = "hosken-admin-notifications-updated";
export const CUSTOMER_NOTIFICATIONS_EVENT =
  "hosken-customer-notifications-updated";

export async function updateAppIconBadge(count: number) {
  if (typeof navigator === "undefined") return;
  const appNavigator = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      await appNavigator.setAppBadge?.(count);
    } else {
      await appNavigator.clearAppBadge?.();
    }
  } catch {
    // The OS or browser may not support app icon badges.
  }
}

export function readAdminSeenIds(key: string) {
  try {
    const values = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set<string>(Array.isArray(values) ? values : []);
  } catch {
    return new Set<string>();
  }
}
export function markAdminNotificationSeen(key: string, id: string) {
  try {
    const values = readAdminSeenIds(key);
    values.add(id);
    localStorage.setItem(key, JSON.stringify([...values]));
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_EVENT));
  } catch {
    /* O aviso segue funcionando durante esta sessão. */
  }
}

type CustomerOrderFingerprint = {
  status: string;
  trackingCode: string;
  updatedAt: number | null;
};
type CustomerOrderUpdate = {
  orderCode: string;
  updatedAt: number;
};
export type CustomerNotificationState = {
  orders: Record<string, CustomerOrderFingerprint>;
  pendingOrders: Record<string, CustomerOrderUpdate>;
  acknowledgedOrderUpdates: Record<string, number>;
};
function customerNotificationKey(uid: string) {
  return `hosken-customer-notifications:${uid}`;
}
export function readCustomerNotificationState(
  uid: string,
): CustomerNotificationState {
  try {
    const value = JSON.parse(
      localStorage.getItem(customerNotificationKey(uid)) || "null",
    );
    if (value && typeof value === "object") {
      return {
        orders:
          value.orders && typeof value.orders === "object" ? value.orders : {},
        pendingOrders:
          value.pendingOrders && typeof value.pendingOrders === "object"
            ? value.pendingOrders
            : {},
        acknowledgedOrderUpdates:
          value.acknowledgedOrderUpdates &&
          typeof value.acknowledgedOrderUpdates === "object"
            ? value.acknowledgedOrderUpdates
            : {},
      };
    }
  } catch {
    /* O sino continua disponível durante esta sessão. */
  }
  return { orders: {}, pendingOrders: {}, acknowledgedOrderUpdates: {} };
}
export function saveCustomerNotificationState(
  uid: string,
  state: CustomerNotificationState,
) {
  try {
    localStorage.setItem(customerNotificationKey(uid), JSON.stringify(state));
    window.dispatchEvent(new Event(CUSTOMER_NOTIFICATIONS_EVENT));
  } catch {
    /* O sino continua disponível durante esta sessão. */
  }
}
