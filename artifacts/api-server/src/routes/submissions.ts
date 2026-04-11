import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable, mapsTable, notificationsTable, activityLogsTable, usersTable, creatorsTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { emitNotification } from "../lib/notificationEmitter";
import { sendPushNotification } from "../lib/webPush";

const RATE_LIMIT_MINUTES = 5;

const router: IRouter = Router();

router.get("/submissions", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let query = db.select().from(submissionsTable).$dynamic();
  if (status) {
    query = query.where(eq(submissionsTable.status, status as typeof submissionsTable.status._.data));
  }
  query = query.orderBy(desc(submissionsTable.createdAt));
  const submissions = await query;
  res.json(submissions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

// ── Bulk reject all selected pending submissions ──
router.post("/submissions/bulk-reject", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const { ids, reason } = req.body as { ids?: number[]; reason?: string };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }

  const pending = await db
    .select()
    .from(submissionsTable)
    .where(and(inArray(submissionsTable.id, ids), eq(submissionsTable.status, "pending")));

  if (pending.length === 0) {
    res.json({ updated: 0 });
    return;
  }

  const pendingIds = pending.map((s) => s.id);

  await db
    .update(submissionsTable)
    .set({ status: "rejected", rejectionReason: reason ?? "Bulk rejected by admin" })
    .where(inArray(submissionsTable.id, pendingIds));

  for (const sub of pending) {
    if (sub.submittedByUserId) {
      const [notif] = await db.insert(notificationsTable).values({
        userId: sub.submittedByUserId,
        type: "submission_rejected",
        title: "Map Submission Update",
        message: `Your map "${sub.mapName ?? sub.mapCode}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        link: "/profile",
        isRead: false,
      }).returning();
      if (notif) emitNotification(sub.submittedByUserId, { ...notif, createdAt: notif.createdAt.toISOString() });
    }
  }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "bulk_reject_submissions",
    targetType: "submission",
    targetId: 0,
    details: `Bulk rejected ${pendingIds.length} submissions. Reason: ${reason ?? "none"}`,
  });

  res.json({ updated: pendingIds.length });
});

// ── Clear ALL pending submissions ──
router.delete("/submissions/pending-clear", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;

  const result = await db
    .delete(submissionsTable)
    .where(eq(submissionsTable.status, "pending"))
    .returning({ id: submissionsTable.id });

  await db.insert(activityLogsTable).values({
    adminId,
    action: "clear_pending_submissions",
    targetType: "submission",
    targetId: 0,
    details: `Cleared ${result.length} pending submissions`,
  });

  res.json({ deleted: result.length });
});

router.post("/submissions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  // Rate limiting: max 1 submission per RATE_LIMIT_MINUTES per user
  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const recent = await db
    .select({ id: submissionsTable.id })
    .from(submissionsTable)
    .where(and(
      eq(submissionsTable.submittedByUserId, userId),
      gte(submissionsTable.createdAt, since),
    ))
    .limit(1);

  if (recent.length > 0) {
    res.status(429).json({ error: `Please wait ${RATE_LIMIT_MINUTES} minutes between submissions.` });
    return;
  }

  const { creatorName, region, mapCode, mapLink, image, mapName } = req.body as {
    creatorName?: string;
    region?: string;
    mapCode?: string;
    mapLink?: string | null;
    image?: string | null;
    mapName?: string | null;
  };
  if (!creatorName || !region || !mapCode) {
    res.status(400).json({ error: "creatorName, region, mapCode are required" });
    return;
  }

  const [submission] = await db.insert(submissionsTable).values({
    creatorName,
    region,
    mapCode,
    mapLink: mapLink ?? null,
    image: image ?? null,
    mapName: mapName ?? null,
    status: "pending",
    submittedByUserId: userId,
  }).returning();

  res.status(201).json({ ...submission, createdAt: submission.createdAt.toISOString() });
});

router.post("/submissions/:id/approve", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Submission not found" }); return; }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `Submission is already ${existing.status}` });
    return;
  }

  const [submission] = await db.update(submissionsTable).set({ status: "approved" }).where(eq(submissionsTable.id, id)).returning();
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  let creatorId: number | null = null;

  if (submission.submittedByUserId) {
    const [byUserId] = await db
      .select({ id: creatorsTable.id })
      .from(creatorsTable)
      .where(eq(creatorsTable.userId, submission.submittedByUserId));
    if (byUserId) creatorId = byUserId.id;
  }

  await db.insert(mapsTable).values({
    name: submission.mapName ?? `${submission.creatorName ?? "Unknown"}'s Map`,
    code: submission.mapCode,
    image: submission.image ?? null,
    mapLink: submission.mapLink ?? null,
    region: submission.region,
    creatorId,
    isFeatured: false,
    isTrending: false,
  });

  if (creatorId) {
    await db.execute(sql`UPDATE creators SET total_maps = total_maps + 1 WHERE id = ${creatorId}`);
  }

  if (submission.submittedByUserId) {
    const [inserted] = await db.insert(notificationsTable).values({
      userId: submission.submittedByUserId,
      type: "submission_approved",
      title: "Map Approved!",
      message: `Your map "${submission.mapName ?? submission.mapCode}" has been approved and is now live.`,
      link: "/explore",
      isRead: false,
    }).returning();
    if (inserted) {
      emitNotification(submission.submittedByUserId, { ...inserted, createdAt: inserted.createdAt.toISOString() });
      void sendPushNotification(submission.submittedByUserId, {
        title: "Map Approved!",
        body: `Your map "${submission.mapName ?? submission.mapCode}" is now live on CraftLand Hub.`,
        url: "/explore",
      });
    }
  }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "approve_submission",
    targetType: "submission",
    targetId: id,
    details: `Approved submission: ${submission.mapCode}`,
  });

  res.json({ ...submission, createdAt: submission.createdAt.toISOString() });
});

router.post("/submissions/:id/reject", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid submission id" }); return; }

  const { reason } = req.body as { reason?: string | null };

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Submission not found" }); return; }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `Submission is already ${existing.status}` });
    return;
  }

  const [submission] = await db.update(submissionsTable)
    .set({ status: "rejected", rejectionReason: reason ?? null })
    .where(eq(submissionsTable.id, id))
    .returning();
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  if (submission.submittedByUserId) {
    const [inserted] = await db.insert(notificationsTable).values({
      userId: submission.submittedByUserId,
      type: "submission_rejected",
      title: "Map Submission Update",
      message: `Your map "${submission.mapName ?? submission.mapCode}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
      link: "/profile",
      isRead: false,
    }).returning();
    if (inserted) {
      emitNotification(submission.submittedByUserId, { ...inserted, createdAt: inserted.createdAt.toISOString() });
      void sendPushNotification(submission.submittedByUserId, {
        title: "Map Submission Update",
        body: `Your map "${submission.mapName ?? submission.mapCode}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        url: "/profile",
      });
    }
  }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "reject_submission",
    targetType: "submission",
    targetId: id,
    details: `Rejected submission: ${submission.mapCode}`,
  });

  res.json({ ...submission, createdAt: submission.createdAt.toISOString() });
});

export default router;
