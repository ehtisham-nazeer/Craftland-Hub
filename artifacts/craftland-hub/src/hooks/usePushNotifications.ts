import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

export function usePushNotifications() {
  const { isSignedIn, getToken } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    if (!isSignedIn) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

    navigator.serviceWorker
      .register(`${basePath}/sw.js`)
      .catch(() => {});
  }, [isSignedIn]);

  const subscribe = async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const vapidResp = await fetch("/api/push/vapid-public-key");
      if (!vapidResp.ok) return false;
      const { publicKey } = await vapidResp.json() as { publicKey: string };

      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      const reg = await navigator.serviceWorker.register(`${basePath}/sw.js`);
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const token = await getToken();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sub.toJSON()),
      });

      return true;
    } catch {
      return false;
    }
  };

  return { permission, subscribe };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return buffer;
}
