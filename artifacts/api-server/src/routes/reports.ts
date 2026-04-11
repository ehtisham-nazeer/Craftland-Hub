import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import { reportsTable, mapsTable, activityLogsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { optionalAuth, requireRole } from "../middlewares/auth";

interface AuthenticatedRequest extends Request {
  userId: string | null;
}

interface AdminRequest extends Request {
  userId: string;
}

const router: IRouter = Router();

router.get("/reports", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let query = db
    .select({
      id: reportsTable.id,
      mapId: reportsTable.mapId,
      mapName: mapsTable.name,
      userId: reportsTable.userId,
      reason: reportsTable.reason,
      description: reportsTable.description,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(mapsTable, eq(reportsTable.mapId, mapsTable.id))
    .$dynamic();

  if (status) {
    query = query.where(eq(reportsTable.status, status as typeof reportsTable.status._.data));
  }
  query = query.orderBy(desc(reportsTable.createdAt));

  const reports = await query;
  res.json(reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/reports", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { mapId, reason, description } = req.body as { mapId?: number; reason?: string; description?: string };
  if (!mapId || !reason) { res.status(400).json({ error: "mapId and reason are required" }); return; }

  if (userId) {
    await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
  }

  const [report] = await db.insert(reportsTable).values({
    mapId,
    userId,
    reason: reason as typeof reportsTable.reason._.data,
    description,
    status: "pending",
  }).returning();

  res.status(201).json({ ...report, createdAt: report.createdAt.toISOString(), mapName: null });
});

router.post("/reports/:id/resolve", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid report id" }); return; }

  const [report] = await db.update(reportsTable).set({ status: "resolved" }).where(eq(reportsTable.id, id)).returning();
  if (!report) { res.status(404).json({ error: "Report not found" }); return; }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "resolve_report",
    targetType: "report",
    targetId: id,
    details: `Resolved report #${id}`,
  });

  res.json({ ...report, createdAt: report.createdAt.toISOString(), mapName: null });
});

router.post("/reports/:id/dismiss", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid report id" }); return; }

  const [report] = await db.update(reportsTable).set({ status: "dismissed" }).where(eq(reportsTable.id, id)).returning();
  if (!report) { res.status(404).json({ error: "Report not found" }); return; }

  await db.insert(activityLogsTable).values({
    adminId,
    action: "dismiss_report",
    targetType: "report",
    targetId: id,
    details: `Dismissed report #${id}`,
  });

  res.json({ ...report, createdAt: report.createdAt.toISOString(), mapName: null });
});

export default router;
