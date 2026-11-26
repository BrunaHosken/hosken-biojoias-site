import { useContext, useEffect } from "react";
import { SessionContext } from "./contexts";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { LegalAcceptanceGate } from "../components/LegalAcceptanceGate";
import {
  AdminNotificationBridge,
  CustomerNotificationBridge,
  FloatingChatButton,
} from "../features/notifications/NotificationCenter";
import { AppRoutes } from "./AppRoutes";
import {
  listenForPushMessages,
  registerMessagingServiceWorker,
  syncPushForUser,
} from "../features/notifications/pushNotifications";

export function SiteLayout() {
  const session = useContext(SessionContext);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void registerMessagingServiceWorker().catch(() => {});
  }, []);

  useEffect(() => {
    if (!session.user) return;
    void syncPushForUser(session.user.uid);
    return listenForPushMessages();
  }, [session.user]);

  return (
    <>
      <SiteHeader />
      <LegalAcceptanceGate />
      <main>
        <AppRoutes />
      </main>
      {session.admin && <AdminNotificationBridge />}
      {session.user && !session.admin && (
        <CustomerNotificationBridge uid={session.user.uid} />
      )}
      <FloatingChatButton />
      <SiteFooter />
    </>
  );
}
