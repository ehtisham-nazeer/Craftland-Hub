import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getVapidPublicKey } from "../lib/webPush";

const router: IRouter = Router();

router.get("/push/vapid-public-key", (_req, res): void => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const subscription = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: "Invalid push subscription" });
    return;
  }

  await db
    .insert(pushSubscriptionsTable)
    .values({
      userId,
      endpoint: subscription.endpoint,
      subscription: subscription,
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId, subscription },
    });

  res.status(201).json({ success: true });
});

router.delete("/push/unsubscribe", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { endpoint } = req.body as { endpoint?: string };

  if (!endpoint) {
    res.status(400).json({ error: "endpoint required" });
    return;
  }

  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.userId, userId),
        eq(pushSubscriptionsTable.endpoint, endpoint),
      ),
    );

  res.json({ success: true });
});

export default router;
