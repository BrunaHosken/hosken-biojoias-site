import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdminConversations, useCustomerConversation } from "../../data";
import {
  CUSTOMER_NOTIFICATIONS_EVENT,
  readCustomerNotificationState,
} from "./notificationStorage";

export function AdminNotificationBridge() {
  const location = useLocation();
  const conversations = useAdminConversations(location.pathname !== "/admin");
  const unreadCount = conversations.data.filter(
    (conversation) => (conversation.unreadForAdmin || 0) > 0,
  ).length;
  useEffect(() => {
    if (location.pathname === "/admin") return;
    document.title = unreadCount
      ? `(${unreadCount}) Atendimento · Hosken Biojoias`
      : "Hosken Biojoias";
    return () => {
      document.title = "Hosken Biojoias";
    };
  }, [location.pathname, unreadCount]);
  return null;
}

export function CustomerNotificationBridge({ uid }: { uid: string }) {
  const conversation = useCustomerConversation(uid);
  const [pendingOrderCount, setPendingOrderCount] = useState(
    () => Object.keys(readCustomerNotificationState(uid).pendingOrders).length,
  );

  useEffect(() => {
    const syncPendingOrders = () =>
      setPendingOrderCount(
        Object.keys(readCustomerNotificationState(uid).pendingOrders).length,
      );
    syncPendingOrders();
    window.addEventListener(CUSTOMER_NOTIFICATIONS_EVENT, syncPendingOrders);
    window.addEventListener("storage", syncPendingOrders);
    return () => {
      window.removeEventListener(
        CUSTOMER_NOTIFICATIONS_EVENT,
        syncPendingOrders,
      );
      window.removeEventListener("storage", syncPendingOrders);
    };
  }, [uid]);

  const unreadCount =
    ((conversation.conversation?.unreadForCustomer || 0) > 0 ? 1 : 0) +
    pendingOrderCount;
  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Hosken Biojoias`
      : "Hosken Biojoias";
  }, [unreadCount]);

  useEffect(
    () => () => {
      document.title = "Hosken Biojoias";
    },
    [],
  );
  return null;
}
