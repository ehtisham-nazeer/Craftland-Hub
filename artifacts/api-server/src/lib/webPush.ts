import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let initialized = false;

export function initWebPush(): void {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:admin@craftlandhub.app";
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured — browser push notifications disabled");
    return;
  }
  webpush.setVapidDetails(email, publicKey, privateKey);
  initialized = true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!initialized) return;

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  const data = JSON.stringify(payload);
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          data,
        );
      } catch (err: unknown) {
        if (
          err instanceof webpush.WebPushError &&
          (err.statusCode === 410 || err.statusCode === 404)
        ) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await Promise.allSettled(
      staleEndpoints.map((ep) =>
        db
          .delete(pushSubscriptionsTable)
          .where(eq(pushSubscriptionsTable.endpoint, ep)),
      ),
    );
  }
}
