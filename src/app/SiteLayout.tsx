import { useContext } from "react";
import { SessionContext } from "./contexts";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import {
  AdminNotificationBridge,
  CustomerNotificationBridge,
  FloatingChatButton,
} from "../features/notifications/NotificationCenter";
import { AppRoutes } from "./AppRoutes";

export function SiteLayout() {
  const session = useContext(SessionContext);

  return (
    <>
      <SiteHeader />
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
