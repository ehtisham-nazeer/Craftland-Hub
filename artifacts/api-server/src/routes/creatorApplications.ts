import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  creatorApplicationsTable,
  usersTable,
  creatorsTable,
  notificationsTable,
  activityLogsTable,
} from "@workspace/db";
import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { emitNotification } from "../lib/notificationEmitter";

const RATE_LIMIT_MINUTES = 5;

const router: IRouter = Router();

router.get("/creator-applications", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let query = db.select().from(creatorApplicationsTable).$dynamic();
  if (status) {
    query = query.where(eq(creatorApplicationsTable.status, status as typeof creatorApplicationsTable.status._.data));
  }
  query = query.orderBy(desc(creatorApplicationsTable.createdAt));
  const apps = await query;
  res.json(apps.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

// ── Bulk reject pending creator applications ──
router.post("/creator-applications/bulk-reject", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const { ids, reason } = req.body as { ids?: number[]; reason?: string };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }

  const pending = await db
    .select()
    .from(creatorApplicationsTable)
    .where(and(inArray(creatorApplicationsTable.id, ids), eq(creatorApplicationsTable.status, "pending")));

  if (pending.length === 0) {
    res.json({ updated: 0 });
    return;
  }

  const pendingIds = pending.map((a) => a.id);

  await db
    .update(creatorApplicationsTable)
    .set({ status: "rejected", rejectionReason: reason ?? "Bulk rejected by admin" })
    .where(inArray(creatorApplicationsTable.id, pendingIds));

  for (const app of pending) {
    const [notif] = await db.insert(notificationsTable).values({
      userId: app.userId,
      type: "creator_application_rejected",
      title: "Creator Application Update",
      message: reason
        ? `Your creator application was not approved: ${reason}`
        : "Your creator application was not approved at this time.",
      link: "/creators",
    }).returning();
    if (notif) emitNotification(app.userId, { ...notif, createdAt: notif.createdAt.toISOString() });
  }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "bulk_reject_creator_apps",
    targetType: "creator_application",
    targetId: 0,
    details: `Bulk rejected ${pendingIds.length} creator applications. Reason: ${reason ?? "none"}`,
  });

  res.json({ updated: pendingIds.length });
});

// ── Clear ALL pending creator applications ──
router.delete("/creator-applications/pending-clear", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;

  const result = await db
    .delete(creatorApplicationsTable)
    .where(eq(creatorApplicationsTable.status, "pending"))
    .returning({ id: creatorApplicationsTable.id });

  await db.insert(activityLogsTable).values({
    adminId,
    action: "clear_pending_creator_apps",
    targetType: "creator_application",
    targetId: 0,
    details: `Cleared ${result.length} pending creator applications`,
  });

  res.json({ deleted: result.length });
});

router.get("/creator-applications/mine", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const apps = await db
    .select()
    .from(creatorApplicationsTable)
    .where(eq(creatorApplicationsTable.userId, userId))
    .orderBy(desc(creatorApplicationsTable.createdAt));
  res.json(apps.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.post("/creator-applications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  // Rate limiting: max 1 application per RATE_LIMIT_MINUTES per user
  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const recent = await db
    .select({ id: creatorApplicationsTable.id })
    .from(creatorApplicationsTable)
    .where(and(
      eq(creatorApplicationsTable.userId, userId),
      gte(creatorApplicationsTable.createdAt, since),
    ))
    .limit(1);

  if (recent.length > 0) {
    res.status(429).json({ error: `Please wait ${RATE_LIMIT_MINUTES} minutes between applications.` });
    return;
  }

  const { inGameName, region, bio, socialLink, logoUrl } = req.body as {
    inGameName?: string;
    region?: string;
    bio?: string;
    socialLink?: string;
    logoUrl?: string;
  };

  if (!inGameName || !region) {
    res.status(400).json({ error: "inGameName and region are required" });
    return;
  }

  const existing = await db
    .select({ id: creatorApplicationsTable.id, status: creatorApplicationsTable.status })
    .from(creatorApplicationsTable)
    .where(eq(creatorApplicationsTable.userId, userId));

  const pending = existing.find((a) => a.status === "pending");
  if (pending) {
    res.status(409).json({ error: "You already have a pending creator application" });
    return;
  }

  const alreadyApproved = existing.find((a) => a.status === "approved");
  if (alreadyApproved) {
    const [activeCreator] = await db
      .select({ id: creatorsTable.id })
      .from(creatorsTable)
      .where(eq(creatorsTable.userId, userId));
    if (activeCreator) {
      res.status(409).json({ error: "You already have an approved creator profile. Visit your profile to edit it." });
      return;
    }
  }

  const [app] = await db
    .insert(creatorApplicationsTable)
    .values({ userId, inGameName, region, bio, socialLink, logoUrl })
    .returning();

  res.status(201).json({ ...app!, createdAt: app!.createdAt.toISOString() });
});

router.patch("/creator-applications/:id/approve", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [app] = await db.select().from(creatorApplicationsTable).where(eq(creatorApplicationsTable.id, id));
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  if (app.status !== "pending") { res.status(409).json({ error: "Application already processed" }); return; }

  const [updated] = await db
    .update(creatorApplicationsTable)
    .set({ status: "approved" })
    .where(eq(creatorApplicationsTable.id, id))
    .returning();

  const [existingCreator] = await db
    .select()
    .from(creatorsTable)
    .where(sql`lower(name) = lower(${app.inGameName})`);

  if (!existingCreator) {
    await db.insert(creatorsTable).values({
      name: app.inGameName,
      region: app.region,
      bio: app.bio ?? undefined,
      logo: app.logoUrl ?? undefined,
      socialLink: app.socialLink ?? undefined,
      userId: app.userId,
    });
  } else {
    const updates: Partial<{ logo: string | null; bio: string | null; socialLink: string | null; userId: string }> = {
      userId: app.userId,
    };
    if (app.logoUrl) updates.logo = app.logoUrl;
    if (app.bio) updates.bio = app.bio;
    if (app.socialLink) updates.socialLink = app.socialLink;
    await db.update(creatorsTable).set(updates).where(eq(creatorsTable.id, existingCreator.id));
  }

  const [approvedNotif] = await db.insert(notificationsTable).values({
    userId: app.userId,
    type: "creator_application_approved",
    title: "Creator Application Approved!",
    message: `Congratulations! Your creator profile for "${app.inGameName}" is now live on CraftLand Hub.`,
    link: "/creators",
  }).returning();
  if (approvedNotif) {
    emitNotification(app.userId, { ...approvedNotif, createdAt: approvedNotif.createdAt.toISOString() });
  }

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString() });
});

router.patch("/creator-applications/:id/reject", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { reason } = req.body as { reason?: string };

  const [app] = await db.select().from(creatorApplicationsTable).where(eq(creatorApplicationsTable.id, id));
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  if (app.status !== "pending") { res.status(409).json({ error: "Application already processed" }); return; }

  const [updated] = await db
    .update(creatorApplicationsTable)
    .set({ status: "rejected", rejectionReason: reason ?? null })
    .where(eq(creatorApplicationsTable.id, id))
    .returning();

  const [rejectedNotif] = await db.insert(notificationsTable).values({
    userId: app.userId,
    type: "creator_application_rejected",
    title: "Creator Application Update",
    message: reason
      ? `Your creator application was not approved: ${reason}`
      : "Your creator application was not approved at this time.",
    link: "/creators",
  }).returning();
  if (rejectedNotif) {
    emitNotification(app.userId, { ...rejectedNotif, createdAt: rejectedNotif.createdAt.toISOString() });
  }

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString() });
});

export default router;
