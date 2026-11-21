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
  const customerPhone = requireText(
    data.customerPhone,
    "customerPhone",
    24,
    true,
  );
  const customerEmail = requireText(data.customerEmail, "customerEmail", 160);
  const deliveryMethod = data.deliveryMethod;
  const paymentMethod = data.paymentMethod;
  const paymentStatus = data.paymentStatus;
  if (!["sedex", "pickup"].includes(deliveryMethod)) {
    throw new HttpsError("invalid-argument", "Invalid delivery method.");
  }
  if (!["credit_card", "debit_card", "pix"].includes(paymentMethod)) {
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
    (paymentMethod !== "credit_card" && installments !== 1)
  ) {
    throw new HttpsError("invalid-argument", "Invalid installments.");
  }
  const isGift = data.isGift === true;
  if (data.isGift !== undefined && typeof data.isGift !== "boolean") {
    throw new HttpsError("invalid-argument", "Invalid gift option.");
  }
  const giftMessage = isGift
    ? requireText(data.giftMessage || "", "giftMessage", 250, true)
    : "";
  if (deliveryMethod === "pickup" && data.pickupAgreed !== true) {
    throw new HttpsError("failed-precondition", "pickup-not-confirmed");
  }
  if (
    !Number.isSafeInteger(data.expectedTotalCents) ||
    data.expectedTotalCents < 0
  ) {
    throw new HttpsError("invalid-argument", "Invalid expected total.");
  }

  const customQuoteId = data.customQuoteId
    ? requireText(data.customQuoteId, "customQuoteId", 150)
    : "";
  const conversationId = data.conversationId
    ? requireText(data.conversationId, "conversationId", 150)
    : "";
  if (
    Boolean(customQuoteId) !== Boolean(conversationId) ||
    (customQuoteId &&
      (!/^[A-Za-z0-9_-]+$/.test(customQuoteId) ||
        !/^[A-Za-z0-9_-]+$/.test(conversationId)))
  ) {
    throw new HttpsError("invalid-argument", "Invalid custom quote.");
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
    customQuoteId &&
    data.items !== undefined &&
    (!Array.isArray(data.items) || data.items.length !== 0)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A custom quote cannot be combined with catalog items.",
    );
  }
  if (
    !customQuoteId &&
    (!Array.isArray(data.items) ||
      data.items.length < 1 ||
      data.items.length > maxItems)
  ) {
    throw new HttpsError("invalid-argument", "Invalid order items.");
  }
  const seen = new Set();
  const items = (customQuoteId ? [] : data.items).map((item) => {
    const productId = requireText(item?.productId, "productId", 150);
    const variantId = item?.variantId
      ? requireText(item.variantId, "variantId", 150)
      : "";
    if (
      (item?.withChain !== undefined && typeof item.withChain !== "boolean") ||
      !/^[A-Za-z0-9_-]+$/.test(productId) ||
      (variantId && !/^[A-Za-z0-9_-]+$/.test(variantId))
    ) {
      throw new HttpsError("invalid-argument", "Invalid or repeated product.");
    }
    const lineKey = `${productId}::${variantId}`;
    if (seen.has(lineKey)) {
      throw new HttpsError("invalid-argument", "Invalid or repeated product.");
    }
    seen.add(lineKey);
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      throw new HttpsError("invalid-argument", "Invalid item quantity.");
    }
    return { productId, variantId, quantity: item.quantity };
  });

  return {
    orderId,
    customerName,
    customerEmail,
    ...(customerPhone ? { customerPhone } : {}),
    deliveryMethod,
    paymentMethod,
    paymentStatus,
    installments,
    isGift,
    giftMessage,
    expectedTotalCents: data.expectedTotalCents,
    address,
    items,
    ...(customQuoteId ? { customQuoteId, conversationId } : {}),
  };
}

function checkoutFingerprint(checkout) {
  const payload = JSON.stringify({
    deliveryMethod: checkout.deliveryMethod,
    paymentMethod: checkout.paymentMethod,
    paymentStatus: checkout.paymentStatus,
    installments: checkout.installments,
    isGift: checkout.isGift,
    giftMessage: checkout.giftMessage,
    expectedTotalCents: checkout.expectedTotalCents,
    items: checkout.items,
    customQuoteId: checkout.customQuoteId || "",
    conversationId: checkout.conversationId || "",
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

      let subtotalCents = 0;
      const orderItems = [];
      const stockUpdates = [];
      let customQuoteRef;
      if (checkout.customQuoteId) {
        if (checkout.conversationId !== userId) {
          throw new HttpsError("permission-denied", "Invalid custom quote.");
        }
        const conversationSnapshot = await transaction.get(
          db.collection("conversations").doc(checkout.conversationId),
        );
        if (
          !conversationSnapshot.exists ||
          conversationSnapshot.get("customerId") !== userId
        ) {
          throw new HttpsError("permission-denied", "Invalid custom quote.");
        }
        customQuoteRef = db
          .collection("conversations")
          .doc(checkout.conversationId)
          .collection("quotes")
          .doc(checkout.customQuoteId);
        const customQuoteSnapshot = await transaction.get(customQuoteRef);
        if (!customQuoteSnapshot.exists) {
          throw new HttpsError("failed-precondition", "custom-quote-not-found");
        }
        const quote = customQuoteSnapshot.data();
        if (quote.customerId !== userId || quote.status !== "accepted") {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-already-used",
          );
        }
        if (
          typeof quote.title !== "string" ||
          !quote.title.trim() ||
          typeof quote.description !== "string" ||
          !Number.isSafeInteger(quote.basePriceCents) ||
          quote.basePriceCents <= 0 ||
          quote.basePriceCents > 100000000
        ) {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-invalid-price",
          );
        }
        const categorySnapshot = await transaction.get(
          db.collection("categories").doc(quote.categoryId),
        );
        if (!categorySnapshot.exists) {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-category-unavailable",
          );
        }
        const categoryName = String(quote.categoryName || "").trim();
        const categorySlug = String(categorySnapshot.get("slug") || "").trim();
        const isNecklace = /(^|-)colar(es)?(-|$)/.test(categorySlug);
        const colorIds = Array.isArray(quote.colorIds) ? quote.colorIds : [];
        const selectedColorId =
          typeof quote.selectedColorId === "string"
            ? quote.selectedColorId
            : "";
        const colorNames =
          quote.colorNames && typeof quote.colorNames === "object"
            ? quote.colorNames
            : {};
        let colorName = "";
        if (colorIds.length) {
          if (!selectedColorId || !colorIds.includes(selectedColorId)) {
            throw new HttpsError(
              "failed-precondition",
              "custom-quote-color-required",
            );
          }
          colorName = String(colorNames[selectedColorId] || "").trim();
          if (!colorName) {
            throw new HttpsError(
              "failed-precondition",
              "custom-quote-color-unavailable",
            );
          }
        } else if (selectedColorId) {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-color-unavailable",
          );
        }
        const hasChainOption = quote.chainAddonPriceCents !== undefined;
        if (
          hasChainOption &&
          (!isNecklace ||
            !Number.isSafeInteger(quote.chainAddonPriceCents) ||
            quote.chainAddonPriceCents <= 0 ||
            quote.chainAddonPriceCents > 100000000)
        ) {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-chain-unavailable",
          );
        }
        const unitPriceCents =
          quote.basePriceCents +
          (hasChainOption ? quote.chainAddonPriceCents : 0);
        if (!Number.isSafeInteger(unitPriceCents)) {
          throw new HttpsError(
            "failed-precondition",
            "custom-quote-invalid-price",
          );
        }
        subtotalCents += unitPriceCents;
        orderItems.push({
          productId: "custom",
          customQuoteId: checkout.customQuoteId,
          customConversationId: checkout.conversationId,
          categoryName,
          customDescription: quote.description.trim(),
          name: quote.title.trim(),
          ...(selectedColorId ? { variantId: selectedColorId, colorName } : {}),
          quantity: 1,
          unitPriceCents,
        });
      }

      const productSnapshots = new Map();
      for (const productId of new Set(
        checkout.items.map((item) => item.productId),
      )) {
        productSnapshots.set(
          productId,
          await transaction.get(db.collection("products").doc(productId)),
        );
      }

      for (const [productId, snapshot] of productSnapshots) {
        if (!snapshot.exists) {
          throw new HttpsError("failed-precondition", "product-unavailable");
        }
        const product = snapshot.data();
        const productItems = checkout.items.filter(
          (item) => item.productId === productId,
        );
        const categorySnapshot = await transaction.get(
          db.collection("categories").doc(product.categoryId),
        );
        const collectionSnapshot = await transaction.get(
          db.collection("collections").doc(product.collectionId),
        );
        const categorySlug = categorySnapshot.exists
          ? String(categorySnapshot.get("slug") || "")
          : "";
        const categoryName = categorySnapshot.exists
          ? String(categorySnapshot.get("name") || "").trim()
          : "";
        const collectionName = collectionSnapshot.exists
          ? String(collectionSnapshot.get("name") || "").trim()
          : "";
        if (
          !categorySnapshot.exists ||
          categorySnapshot.get("status") !== "published" ||
          !collectionSnapshot.exists ||
          collectionSnapshot.get("status") !== "published"
        ) {
          throw new HttpsError("failed-precondition", "catalog-unavailable");
        }
        const isNecklace = /(^|-)colar(es)?(-|$)/.test(categorySlug);
        const colorVariants = Array.isArray(product.colorVariants)
          ? product.colorVariants
          : [];
        if (
          colorVariants.some(
            (variant) =>
              typeof variant.colorId !== "string" ||
              !/^[A-Za-z0-9_-]+$/.test(variant.colorId) ||
              typeof variant.colorName !== "string" ||
              !variant.colorName.trim() ||
              !Number.isSafeInteger(variant.stock) ||
              variant.stock < 0,
          )
        ) {
          throw new HttpsError("failed-precondition", "invalid-product-stock");
        }
        const variantsById = new Map(
          colorVariants.map((variant) => [variant.colorId, variant]),
        );
        if (variantsById.size !== colorVariants.length) {
          throw new HttpsError("failed-precondition", "invalid-product-stock");
        }
        for (const colorId of new Set(
          productItems.map((item) => item.variantId).filter(Boolean),
        )) {
          const colorSnapshot = await transaction.get(
            db.collection("colors").doc(colorId),
          );
          if (
            !colorSnapshot.exists ||
            colorSnapshot.get("status") !== "published"
          ) {
            throw new HttpsError("failed-precondition", "color-unavailable");
          }
        }
        if (
          product.status !== "published" ||
          !["available", "soldout"].includes(product.availability) ||
          !Number.isSafeInteger(product.stock)
        ) {
          throw new HttpsError("failed-precondition", "stock-changed");
        }
        if (
          !Number.isSafeInteger(product.priceCents) ||
          product.priceCents < 0
        ) {
          throw new HttpsError("failed-precondition", "invalid-product-price");
        }

        if (
          product.chainAddonPriceCents !== undefined &&
          (!Number.isSafeInteger(product.chainAddonPriceCents) ||
            product.chainAddonPriceCents < 0)
        ) {
          throw new HttpsError("failed-precondition", "invalid-product-price");
        }
        const chainPriceCents = isNecklace
          ? product.chainAddonPriceCents !== undefined
            ? product.priceCents + product.chainAddonPriceCents
            : product.withChainPriceCents
          : undefined;
        if (
          chainPriceCents !== undefined &&
          !Number.isSafeInteger(chainPriceCents)
        ) {
          throw new HttpsError("failed-precondition", "invalid-product-price");
        }

        const requestedByColor = new Map();
        let scalarQuantity = 0;
        for (const item of productItems) {
          let variant;
          if (colorVariants.length) {
            if (!item.variantId) {
              throw new HttpsError("failed-precondition", "color-required");
            }
            variant = variantsById.get(item.variantId);
            if (!variant) {
              throw new HttpsError("failed-precondition", "color-unavailable");
            }
            requestedByColor.set(
              item.variantId,
              (requestedByColor.get(item.variantId) || 0) + item.quantity,
            );
          } else {
            if (item.variantId) {
              throw new HttpsError("failed-precondition", "color-unavailable");
            }
            scalarQuantity += item.quantity;
          }

          const unitPriceCents =
            isNecklace && chainPriceCents !== undefined
              ? chainPriceCents
              : product.priceCents;
          if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
            throw new HttpsError(
              "failed-precondition",
              "invalid-product-price",
            );
          }
          subtotalCents += unitPriceCents * item.quantity;
          if (!Number.isSafeInteger(subtotalCents)) {
            throw new HttpsError(
              "failed-precondition",
              "order-total-too-large",
            );
          }
          orderItems.push({
            productId: snapshot.id,
            ...(categoryName ? { categoryName } : {}),
            ...(collectionName ? { collectionName } : {}),
            ...(item.variantId
              ? {
                  variantId: item.variantId,
                  colorName: variant.colorName,
                }
              : {}),
            name: product.name,
            quantity: item.quantity,
            unitPriceCents,
          });
        }

        let updatedColorVariants;
        let totalStock;
        if (colorVariants.length) {
          updatedColorVariants = colorVariants.map((variant) => {
            if (
              !Number.isSafeInteger(variant.stock) ||
              variant.stock < 0 ||
              typeof variant.colorName !== "string"
            ) {
              throw new HttpsError(
                "failed-precondition",
                "invalid-product-stock",
              );
            }
            const requested = requestedByColor.get(variant.colorId) || 0;
            if (variant.stock < requested) {
              throw new HttpsError("failed-precondition", "stock-changed");
            }
            return { ...variant, stock: variant.stock - requested };
          });
          totalStock = updatedColorVariants.reduce(
            (total, variant) => total + variant.stock,
            0,
          );
        } else {
          if (product.stock < scalarQuantity) {
            throw new HttpsError("failed-precondition", "stock-changed");
          }
          totalStock = product.stock - scalarQuantity;
        }
        stockUpdates.push({
          ref: snapshot.ref,
          stock: totalStock,
          soldCount:
            (Number.isSafeInteger(product.soldCount) && product.soldCount >= 0
              ? product.soldCount
              : 0) +
            (checkout.paymentStatus === "simulated_paid"
              ? productItems.reduce((total, item) => total + item.quantity, 0)
              : 0),
          ...(updatedColorVariants
            ? { colorVariants: updatedColorVariants }
            : {}),
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
          soldCount: update.soldCount,
          availability: update.stock > 0 ? "available" : "soldout",
          ...(update.colorVariants
            ? { colorVariants: update.colorVariants }
            : {}),
        });
      }
      if (customQuoteRef) {
        transaction.update(customQuoteRef, {
          status: "ordered",
          orderId: orderRef.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.create(orderRef, {
        userId,
        customerName: checkout.customerName,
        customerEmail: checkout.customerEmail,
        ...(checkout.customerPhone
          ? { customerPhone: checkout.customerPhone }
          : {}),
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
        ...(checkout.isGift ? { isGift: true } : {}),
        ...(checkout.isGift && checkout.giftMessage
          ? { giftMessage: checkout.giftMessage }
          : {}),
        deliveryMethod: checkout.deliveryMethod,
        ...(deliveryAddress ? { deliveryAddress } : {}),
        isDemo: true,
        notificationEligible: true,
        stockReserved: !checkout.customQuoteId,
        reservationStatus: checkout.customQuoteId ? "not_applicable" : "active",
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
      const orderItems = Array.isArray(order.items) ? order.items : [];
      const isCustomOnlyOrder =
        orderItems.length > 0 &&
        orderItems.every(
          (item) =>
            item.productId === "custom" &&
            typeof item.customQuoteId === "string" &&
            item.customQuoteId.length > 0,
        );
      const hasActiveStockReservation =
        order.stockReserved !== false && order.reservationStatus === "active";
      const isCustomOrderWithoutStock =
        order.stockReserved === false &&
        order.reservationStatus === "not_applicable" &&
        isCustomOnlyOrder;
      if (!hasActiveStockReservation && !isCustomOrderWithoutStock) {
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
      if (orderItems.length === 0 || orderItems.length > maxItems) {
        throw new HttpsError("failed-precondition", "Invalid saved order.");
      }

      let customQuoteRef;
      if (isCustomOrderWithoutStock) {
        const customItem = orderItems[0];
        if (customItem.customConversationId !== order.userId) {
          throw new HttpsError("failed-precondition", "Invalid custom order.");
        }
        customQuoteRef = db
          .collection("conversations")
          .doc(customItem.customConversationId)
          .collection("quotes")
          .doc(customItem.customQuoteId);
        const quoteSnapshot = await transaction.get(customQuoteRef);
        if (
          !quoteSnapshot.exists ||
          quoteSnapshot.get("status") !== "ordered" ||
          quoteSnapshot.get("orderId") !== orderId
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Invalid custom order proposal.",
          );
        }
      }

      const itemsByProduct = new Map();
      for (const item of orderItems) {
        if (
          typeof item.productId !== "string" ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1
        ) {
          throw new HttpsError("failed-precondition", "Invalid saved order.");
        }
        const items = itemsByProduct.get(item.productId) || [];
        items.push(item);
        itemsByProduct.set(item.productId, items);
      }

      const productSnapshots = new Map();
      for (const productId of hasActiveStockReservation
        ? itemsByProduct.keys()
        : []) {
        productSnapshots.set(
          productId,
          await transaction.get(db.collection("products").doc(productId)),
        );
      }

      for (const [productId, items] of hasActiveStockReservation
        ? itemsByProduct
        : []) {
        const productSnapshot = productSnapshots.get(productId);
        if (!productSnapshot.exists) continue;
        const product = productSnapshot.data();
        if (!Number.isSafeInteger(product.stock)) {
          throw new HttpsError("failed-precondition", "Invalid stock record.");
        }
        const colorVariants = Array.isArray(product.colorVariants)
          ? product.colorVariants
          : [];
        let stock;
        let updatedColorVariants;
        if (colorVariants.length) {
          const requestedByColor = new Map();
          for (const item of items) {
            const variantId =
              typeof item.variantId === "string" && item.variantId
                ? item.variantId
                : colorVariants[0].colorId;
            requestedByColor.set(
              variantId,
              (requestedByColor.get(variantId) || 0) + item.quantity,
            );
          }
          const variantsById = new Map(
            colorVariants.map((variant) => [variant.colorId, variant]),
          );
          for (const variantId of requestedByColor.keys()) {
            if (variantsById.has(variantId)) continue;
            const sourceItem = items.find(
              (item) => item.variantId === variantId,
            );
            variantsById.set(variantId, {
              colorId: variantId,
              colorName: sourceItem?.colorName || "Cor arquivada",
              stock: 0,
            });
          }
          updatedColorVariants = Array.from(variantsById.values()).map(
            (variant) => {
              if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) {
                throw new HttpsError(
                  "failed-precondition",
                  "Invalid stock record.",
                );
              }
              return {
                ...variant,
                stock:
                  variant.stock + (requestedByColor.get(variant.colorId) || 0),
              };
            },
          );
          stock = updatedColorVariants.reduce(
            (total, variant) => total + variant.stock,
            0,
          );
        } else {
          stock =
            product.stock +
            items.reduce((total, item) => total + item.quantity, 0);
        }
        transaction.update(productSnapshot.ref, {
          stock,
          soldCount: Math.max(
            0,
            (Number.isSafeInteger(product.soldCount) && product.soldCount >= 0
              ? product.soldCount
              : 0) -
              (order.paymentStatus === "simulated_paid"
                ? items.reduce((total, item) => total + item.quantity, 0)
                : 0),
          ),
          availability: ["available", "soldout"].includes(product.availability)
            ? stock > 0
              ? "available"
              : "soldout"
            : product.availability,
          ...(updatedColorVariants
            ? { colorVariants: updatedColorVariants }
            : {}),
        });
      }

      transaction.update(orderRef, {
        status: "cancelled",
        reservationStatus: hasActiveStockReservation
          ? "released"
          : "not_applicable",
        stockReserved: false,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (customQuoteRef) {
        transaction.update(customQuoteRef, {
          status: "accepted",
          orderId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return { id: orderId, alreadyCancelled: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Demo cancellation transaction failed", error);
    throw new HttpsError("internal", "Could not cancel the test order.");
  }
});

export const confirmOrderDelivery = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const orderId = requireText(request.data?.orderId, "orderId", 80);
  if (!/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Invalid order id.");
  }
  const orderRef = db.collection("orders").doc(orderId);

  try {
    return await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        throw new HttpsError("not-found", "Order not found.");
      }
      const order = orderSnapshot.data();
      if (order.userId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "This is not your order.");
      }
      if (order.status !== "in_transit") {
        throw new HttpsError(
          "failed-precondition",
          "Only orders in transit can be confirmed as delivered.",
        );
      }
      transaction.update(orderRef, {
        status: "completed",
        customerConfirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: orderId, status: "completed" };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Order delivery confirmation failed", error);
    throw new HttpsError("internal", "Could not confirm order delivery.");
  }
});

function validateReviewPhotos(value, uid) {
  if (!Array.isArray(value) || value.length > 3) {
    throw new HttpsError("invalid-argument", "Invalid review photos.");
  }
  return value.map((photo) => {
    const path = typeof photo?.path === "string" ? photo.path : "";
    const urlText = typeof photo?.url === "string" ? photo.url : "";
    let url;
    try {
      url = new URL(urlText);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid review photo URL.");
    }
    const validHost =
      url.hostname === "firebasestorage.googleapis.com" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost";
    let decodedPath = "";
    try {
      decodedPath = decodeURIComponent(url.pathname);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid review photo URL.");
    }
    if (
      !/^reviews\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+[.]webp$/.test(path) ||
      !path.startsWith(`reviews/${uid}/`) ||
      path.length > 300 ||
      url.protocol !==
        (url.hostname === "127.0.0.1" || url.hostname === "localhost"
          ? "http:"
          : "https:") ||
      !validHost ||
      !decodedPath.endsWith(`/${path}`)
    ) {
      throw new HttpsError("invalid-argument", "Invalid review photo.");
    }
    return { path, url: urlText };
  });
}

export const submitProductReview = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const uid = request.auth.uid;
  const data = request.data || {};
  const orderId = requireText(data.orderId, "orderId", 80);
  const itemIndex = data.itemIndex;
  const rating = data.rating;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  const anonymous = data.anonymous === true;
  if (
    !/^[A-Za-z0-9_-]+$/.test(orderId) ||
    !Number.isInteger(itemIndex) ||
    itemIndex < 0 ||
    itemIndex > 99 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof data.text !== "string" ||
    text.length > 3000 ||
    (data.anonymous !== undefined && typeof data.anonymous !== "boolean")
  ) {
    throw new HttpsError("invalid-argument", "Invalid product review.");
  }
  const photos = validateReviewPhotos(data.photos || [], uid);
  const reviewId = createHash("sha256")
    .update(`${uid}:${orderId}:${itemIndex}`)
    .digest("hex");
  const orderRef = db.collection("orders").doc(orderId);
  const reviewRef = db.collection("reviews").doc(reviewId);
  const publicRef = db.collection("publicReviews").doc(reviewId);

  try {
    return await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      const previousReview = await transaction.get(reviewRef);
      if (
        !orderSnapshot.exists ||
        orderSnapshot.get("userId") !== uid ||
        orderSnapshot.get("status") !== "completed"
      ) {
        throw new HttpsError("failed-precondition", "review-not-eligible");
      }
      if (previousReview.exists) {
        throw new HttpsError("already-exists", "review-already-submitted");
      }
      const items = orderSnapshot.get("items");
      if (!Array.isArray(items) || itemIndex >= items.length) {
        throw new HttpsError("invalid-argument", "Invalid purchased item.");
      }
      const item = items[itemIndex];
      const productId = typeof item?.productId === "string" ? item.productId : "";
      const productName = typeof item?.name === "string" ? item.name.trim() : "";
      if (
        !productId ||
        productId === "custom" ||
        !/^[A-Za-z0-9_-]+$/.test(productId) ||
        !productName
      ) {
        throw new HttpsError("failed-precondition", "item-not-reviewable");
      }
      const customerName = String(
        orderSnapshot.get("customerName") || "Cliente",
      ).trim();
      const orderNumber = String(orderSnapshot.get("orderNumber") || orderId);
      const now = FieldValue.serverTimestamp();
      transaction.create(reviewRef, {
        customerId: uid,
        orderId,
        itemIndex,
        productId,
        productName,
        orderNumber,
        customerName,
        rating,
        text,
        anonymous,
        photos,
        featuredHome: false,
        createdAt: now,
      });
      transaction.create(publicRef, {
        productId,
        ...(anonymous ? {} : { productName, displayName: customerName }),
        rating,
        text,
        anonymous,
        photos,
        featuredHome: false,
        createdAt: now,
      });
      return { id: reviewId };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Product review submission failed", error);
    throw new HttpsError("internal", "Could not submit the product review.");
  }
});

export const updateProductReview = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const uid = request.auth.uid;
  const data = request.data || {};
  const orderId = requireText(data.orderId, "orderId", 80);
  const itemIndex = data.itemIndex;
  const rating = data.rating;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  const anonymous = data.anonymous === true;
  if (
    !/^[A-Za-z0-9_-]+$/.test(orderId) ||
    !Number.isInteger(itemIndex) ||
    itemIndex < 0 ||
    itemIndex > 99 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof data.text !== "string" ||
    text.length > 3000 ||
    (data.anonymous !== undefined && typeof data.anonymous !== "boolean")
  ) {
    throw new HttpsError("invalid-argument", "Invalid product review.");
  }
  const photos = validateReviewPhotos(data.photos || [], uid);
  const reviewId = createHash("sha256")
    .update(`${uid}:${orderId}:${itemIndex}`)
    .digest("hex");
  const orderRef = db.collection("orders").doc(orderId);
  const reviewRef = db.collection("reviews").doc(reviewId);
  const publicRef = db.collection("publicReviews").doc(reviewId);

  try {
    return await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      const reviewSnapshot = await transaction.get(reviewRef);
      const publicSnapshot = await transaction.get(publicRef);
      if (
        !orderSnapshot.exists ||
        orderSnapshot.get("userId") !== uid ||
        orderSnapshot.get("status") !== "completed"
      ) {
        throw new HttpsError("failed-precondition", "review-not-eligible");
      }
      if (
        !reviewSnapshot.exists ||
        reviewSnapshot.get("customerId") !== uid ||
        !publicSnapshot.exists
      ) {
        throw new HttpsError("not-found", "review-not-found");
      }
      const items = orderSnapshot.get("items");
      if (!Array.isArray(items) || itemIndex >= items.length) {
        throw new HttpsError("invalid-argument", "Invalid purchased item.");
      }
      const item = items[itemIndex];
      if (
        !item ||
        item.productId !== reviewSnapshot.get("productId") ||
        item.productId === "custom"
      ) {
        throw new HttpsError("failed-precondition", "item-not-reviewable");
      }
      const customerName = String(
        orderSnapshot.get("customerName") || "Cliente",
      ).trim();
      const updatedAt = FieldValue.serverTimestamp();
      const reviewUpdates = { rating, text, anonymous, photos, updatedAt };
      const publicUpdates = {
        rating,
        text,
        anonymous,
        photos,
        updatedAt,
        ...(anonymous
          ? { productName: FieldValue.delete(), displayName: FieldValue.delete() }
          : {
              productName: reviewSnapshot.get("productName"),
              displayName: customerName,
            }),
      };
      transaction.update(reviewRef, reviewUpdates);
      transaction.update(publicRef, publicUpdates);
      return { id: reviewId };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Product review update failed", error);
    throw new HttpsError("internal", "Could not update the product review.");
  }
});

export const setReviewFeatured = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const reviewId = requireText(request.data?.reviewId, "reviewId", 64);
  const featuredHome = request.data?.featuredHome;
  if (!/^[a-f0-9]{64}$/.test(reviewId) || typeof featuredHome !== "boolean") {
    throw new HttpsError("invalid-argument", "Invalid review selection.");
  }
  const reviewRef = db.collection("reviews").doc(reviewId);
  const publicRef = db.collection("publicReviews").doc(reviewId);
  try {
    return await db.runTransaction(async (transaction) => {
      const reviewSnapshot = await transaction.get(reviewRef);
      const publicSnapshot = await transaction.get(publicRef);
      const featuredSnapshot = await transaction.get(
        db.collection("publicReviews").where("featuredHome", "==", true),
      );
      const settingsSnapshot = await transaction.get(
        db.collection("siteSettings").doc("reviews"),
      );
      if (!reviewSnapshot.exists || !publicSnapshot.exists) {
        throw new HttpsError("not-found", "Review not found.");
      }
      const currentlyFeatured = reviewSnapshot.get("featuredHome") === true;
      const homepageLimit = settingsSnapshot.exists
        ? settingsSnapshot.get("homepageLimit")
        : 5;
      if (
        featuredHome &&
        !currentlyFeatured &&
        featuredSnapshot.size >= homepageLimit
      ) {
        throw new HttpsError("failed-precondition", "homepage-review-limit");
      }
      transaction.update(reviewRef, { featuredHome });
      transaction.update(publicRef, { featuredHome });
      return { featuredHome };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Featured review update failed", error);
    throw new HttpsError("internal", "Could not update featured review.");
  }
});

export const setHomepageReviewLimit = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const homepageLimit = request.data?.homepageLimit;
  if (!Number.isInteger(homepageLimit) || homepageLimit < 1 || homepageLimit > 30) {
    throw new HttpsError("invalid-argument", "Invalid homepage review limit.");
  }
  const settingsRef = db.collection("siteSettings").doc("reviews");
  try {
    return await db.runTransaction(async (transaction) => {
      const featuredSnapshot = await transaction.get(
        db.collection("publicReviews").where("featuredHome", "==", true),
      );
      if (featuredSnapshot.size > homepageLimit) {
        throw new HttpsError(
          "failed-precondition",
          "homepage-review-limit-below-selected",
        );
      }
      transaction.set(
        settingsRef,
        {
          homepageLimit,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );
      return { homepageLimit };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Homepage review limit update failed", error);
    throw new HttpsError("internal", "Could not update homepage review limit.");
  }
});
