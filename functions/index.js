import { createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const region = "southamerica-east1";
const installmentRate = 0.02;
const maxItems = 20;

function requireDemoTester(request) {
  if (process.env.FUNCTIONS_EMULATOR === "true") return;
  const allowlist = new Set(
    (process.env.DEMO_CHECKOUT_ALLOWED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const email = String(request.auth?.token.email || "").toLowerCase();
  if (!email || !allowlist.has(email)) {
    throw new HttpsError(
      "permission-denied",
      "Demo checkout is only enabled for authorized tester accounts.",
    );
  }
}

function requireText(value, field, limit, optional = false) {
  if (optional && (value === undefined || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.length > limit) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value.trim();
}

function validateCheckout(data) {
  const orderId = requireText(data.orderId, "orderId", 80);
  if (!/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Invalid orderId.");
  }

  const customerName = requireText(data.customerName, "customerName", 100);
  const customerPhone = requireText(data.customerPhone, "customerPhone", 24);
  const customerEmail = requireText(data.customerEmail, "customerEmail", 160);
  const deliveryMethod = data.deliveryMethod;
  const paymentMethod = data.paymentMethod;
  const paymentStatus = data.paymentStatus;
  if (!["sedex", "pickup"].includes(deliveryMethod)) {
    throw new HttpsError("invalid-argument", "Invalid delivery method.");
  }
  if (!["credit_card", "pix"].includes(paymentMethod)) {
    throw new HttpsError("invalid-argument", "Invalid payment method.");
  }
  if (!["simulated_paid", "pending"].includes(paymentStatus)) {
    throw new HttpsError("invalid-argument", "Invalid payment status.");
  }
  const installments = data.installments;
  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 6 ||
    (paymentMethod === "pix" && installments !== 1)
  ) {
    throw new HttpsError("invalid-argument", "Invalid installments.");
  }
  if (deliveryMethod === "pickup" && data.pickupAgreed !== true) {
    throw new HttpsError("failed-precondition", "pickup-not-confirmed");
  }
  if (
    !Number.isSafeInteger(data.expectedTotalCents) ||
    data.expectedTotalCents < 0
  ) {
    throw new HttpsError("invalid-argument", "Invalid expected total.");
  }

  let address;
  if (deliveryMethod === "sedex") {
    if (!data.address || typeof data.address !== "object") {
      throw new HttpsError("invalid-argument", "Address is required.");
    }
    address = {
      postalCode: requireText(data.address.postalCode, "postalCode", 9),
      street: requireText(data.address.street, "street", 160),
      number: requireText(data.address.number, "number", 20),
      complement: requireText(data.address.complement, "complement", 100, true),
      neighborhood: requireText(data.address.neighborhood, "neighborhood", 100),
      city: requireText(data.address.city, "city", 100),
      state: requireText(data.address.state, "state", 2).toUpperCase(),
    };
    if (!/^[0-9]{5}-?[0-9]{3}$/.test(address.postalCode)) {
      throw new HttpsError("invalid-argument", "Invalid postal code.");
    }
  }

  if (
    !Array.isArray(data.items) ||
    data.items.length < 1 ||
    data.items.length > maxItems
  ) {
    throw new HttpsError("invalid-argument", "Invalid order items.");
  }
  const seen = new Set();
  const items = data.items.map((item) => {
    const productId = requireText(item?.productId, "productId", 150);
    if (!/^[A-Za-z0-9_-]+$/.test(productId) || seen.has(productId)) {
      throw new HttpsError("invalid-argument", "Invalid or repeated product.");
    }
    seen.add(productId);
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      throw new HttpsError("invalid-argument", "Invalid item quantity.");
    }
    return { productId, quantity: item.quantity };
  });

  return {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    deliveryMethod,
    paymentMethod,
    paymentStatus,
    installments,
    expectedTotalCents: data.expectedTotalCents,
    address,
    items,
  };
}

function checkoutFingerprint(checkout) {
  const payload = JSON.stringify({
    deliveryMethod: checkout.deliveryMethod,
    paymentMethod: checkout.paymentMethod,
    paymentStatus: checkout.paymentStatus,
    installments: checkout.installments,
    expectedTotalCents: checkout.expectedTotalCents,
    items: checkout.items,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export const createDemoOrder = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  requireDemoTester(request);
  const checkout = validateCheckout(request.data || {});
  const orderRef = db.collection("orders").doc(checkout.orderId);
  const userId = request.auth.uid;
  const fingerprint = checkoutFingerprint(checkout);

  try {
    return await db.runTransaction(async (transaction) => {
      const previousOrder = await transaction.get(orderRef);
      if (previousOrder.exists) {
        if (
          previousOrder.get("userId") !== userId ||
          previousOrder.get("checkoutFingerprint") !== fingerprint
        ) {
          throw new HttpsError("already-exists", "Order id is already in use.");
        }
        return {
          id: orderRef.id,
          orderNumber: previousOrder.get("orderNumber"),
          totalCents: previousOrder.get("totalCents"),
          alreadyExists: true,
        };
      }

      const productSnapshots = [];
      for (const item of checkout.items) {
        const snapshot = await transaction.get(
          db.collection("products").doc(item.productId),
        );
        productSnapshots.push(snapshot);
      }

      let subtotalCents = 0;
      const orderItems = [];
      const stockUpdates = [];
      for (const [index, item] of checkout.items.entries()) {
        const snapshot = productSnapshots[index];
        if (!snapshot.exists) {
          throw new HttpsError("failed-precondition", "product-unavailable");
        }
        const product = snapshot.data();
        if (
          product.status !== "published" ||
          !["available", "soldout"].includes(product.availability) ||
          !Number.isSafeInteger(product.stock) ||
          product.stock < item.quantity
        ) {
          throw new HttpsError("failed-precondition", "stock-changed");
        }
        if (
          !Number.isSafeInteger(product.priceCents) ||
          product.priceCents < 0
        ) {
          throw new HttpsError("failed-precondition", "invalid-product-price");
        }
        const lineTotal = product.priceCents * item.quantity;
        subtotalCents += lineTotal;
        if (!Number.isSafeInteger(subtotalCents)) {
          throw new HttpsError("failed-precondition", "order-total-too-large");
        }
        orderItems.push({
          productId: snapshot.id,
          name: product.name,
          quantity: item.quantity,
          unitPriceCents: product.priceCents,
        });
        stockUpdates.push({
          ref: snapshot.ref,
          stock: product.stock - item.quantity,
        });
      }

      const totalCents =
        checkout.paymentMethod === "credit_card"
          ? Math.round(
              subtotalCents *
                (1 + installmentRate * Math.max(0, checkout.installments - 1)),
            )
          : subtotalCents;
      if (totalCents !== checkout.expectedTotalCents) {
        throw new HttpsError("failed-precondition", "price-changed");
      }
      const orderNumber = `HB-${checkout.orderId.slice(-8).toUpperCase()}`;
      const deliveryAddress = checkout.address
        ? [
            [checkout.address.street, checkout.address.number]
              .filter(Boolean)
              .join(", "),
            checkout.address.complement,
            checkout.address.neighborhood,
            [checkout.address.city, checkout.address.state]
              .filter(Boolean)
              .join(" / "),
            `CEP ${checkout.address.postalCode}`,
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined;

      for (const update of stockUpdates) {
        transaction.update(update.ref, {
          stock: update.stock,
          availability: update.stock > 0 ? "available" : "soldout",
        });
      }
      transaction.create(orderRef, {
        userId,
        customerName: checkout.customerName,
        customerEmail: checkout.customerEmail,
        customerPhone: checkout.customerPhone,
        orderNumber,
        items: orderItems,
        totalCents,
        status:
          checkout.paymentStatus === "simulated_paid"
            ? "preparing"
            : "pending_payment",
        paymentStatus: checkout.paymentStatus,
        paymentMethod: checkout.paymentMethod,
        installments: checkout.installments,
        deliveryMethod: checkout.deliveryMethod,
        ...(deliveryAddress ? { deliveryAddress } : {}),
        isDemo: true,
        stockReserved: true,
        reservationStatus: "active",
        checkoutFingerprint: fingerprint,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        id: orderRef.id,
        orderNumber,
        totalCents,
        alreadyExists: false,
      };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Demo checkout transaction failed", error);
    throw new HttpsError("internal", "Could not create the test order.");
  }
});

export const cancelDemoOrder = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const orderId = requireText(request.data?.orderId, "orderId", 80);
  if (!/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Invalid order id.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  const uid = request.auth.uid;
  const isAdmin = request.auth.token.admin === true;

  try {
    return await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new HttpsError("not-found", "Order not found.");
      }
      const order = orderSnapshot.data();
      if (!isAdmin && order.userId !== uid) {
        throw new HttpsError("permission-denied", "This is not your order.");
      }
      if (order.isDemo !== true) {
        throw new HttpsError(
          "failed-precondition",
          "Only test orders can be cancelled here.",
        );
      }
      if (order.reservationStatus !== "active") {
        if (order.status === "cancelled") {
          return { id: orderId, alreadyCancelled: true };
        }
        throw new HttpsError(
          "failed-precondition",
          "This order no longer has an active stock reservation.",
        );
      }
      if (
        !["pending_payment", "confirmed", "preparing", "cancelled"].includes(
          order.status,
        )
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This order can no longer be cancelled from the test checkout.",
        );
      }
      if (!Array.isArray(order.items) || order.items.length > maxItems) {
        throw new HttpsError("failed-precondition", "Invalid saved order.");
      }

      const productSnapshots = [];
      for (const item of order.items) {
        productSnapshots.push(
          await transaction.get(db.collection("products").doc(item.productId)),
        );
      }

      for (const [index, item] of order.items.entries()) {
        const productSnapshot = productSnapshots[index];
        if (!productSnapshot.exists) continue;
        const product = productSnapshot.data();
        if (
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isSafeInteger(product.stock)
        ) {
          throw new HttpsError("failed-precondition", "Invalid stock record.");
        }
        const stock = product.stock + item.quantity;
        transaction.update(productSnapshot.ref, {
          stock,
          availability: ["available", "soldout"].includes(product.availability)
            ? stock > 0
              ? "available"
              : "soldout"
            : product.availability,
        });
      }

      transaction.update(orderRef, {
        status: "cancelled",
        reservationStatus: "released",
        stockReserved: false,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: orderId, alreadyCancelled: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Demo cancellation transaction failed", error);
    throw new HttpsError("internal", "Could not cancel the test order.");
  }
});
