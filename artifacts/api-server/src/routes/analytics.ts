import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  mapsTable,
  creatorsTable,
  usersTable,
  submissionsTable,
  reportsTable,
  activityLogsTable,
} from "@workspace/db";
import { desc, sql, eq, isNotNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

function roundDownForDisplay(n: number): number {
  if (n <= 0) return 0;
  if (n < 10) return Math.max(1, n - 1);
  if (n < 50) return Math.floor(n / 5) * 5;
  if (n < 200) return Math.floor(n / 10) * 10;
  if (n < 1000) return Math.floor(n / 50) * 50;
  if (n < 10000) return Math.floor(n / 100) * 100;
  return Math.floor(n / 1000) * 1000;
}

const router: IRouter = Router();

router.get("/stats/public", async (_req, res): Promise<void> => {
  const [[mapsRow], [creatorsRow], [usersRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(mapsTable),
    db.select({ count: sql<number>`count(*)` }).from(creatorsTable).where(isNotNull(creatorsTable.userId)),
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
  ]);
  res.json({
    totalMaps: Math.max(50, roundDownForDisplay(Number(mapsRow.count))),
    totalCreators: Math.max(10, roundDownForDisplay(Number(creatorsRow.count))),
    totalPlayers: Math.max(1000, roundDownForDisplay(Number(usersRow.count))),
  });
});

router.get("/analytics/summary", requireRole(["admin", "super_admin", "moderator"]), async (_req, res): Promise<void> => {
  const [mapsCount] = await db.select({ count: sql<number>`count(*)` }).from(mapsTable);
  const [creatorsCount] = await db.select({ count: sql<number>`count(*)` }).from(creatorsTable);
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [submissionsCount] = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable);
  const [pendingSubmissionsCount] = await db.select({ count: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.status, "pending"));
  const [likesSum] = await db.select({ sum: sql<number>`COALESCE(SUM(likes), 0)` }).from(mapsTable);
  const [viewsSum] = await db.select({ sum: sql<number>`COALESCE(SUM(views), 0)` }).from(mapsTable);
  const [reportsCount] = await db.select({ count: sql<number>`count(*)` }).from(reportsTable);
  const [pendingReportsCount] = await db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(eq(reportsTable.status, "pending"));

  res.json({
    totalMaps: Number(mapsCount.count),
    totalCreators: Number(creatorsCount.count),
    totalUsers: Number(usersCount.count),
    totalSubmissions: Number(submissionsCount.count),
    pendingSubmissions: Number(pendingSubmissionsCount.count),
    totalLikes: Number(likesSum.sum),
    totalViews: Number(viewsSum.sum),
    totalReports: Number(reportsCount.count),
    pendingReports: Number(pendingReportsCount.count),
  });
});

router.get("/analytics/top-maps", requireRole(["admin", "super_admin", "moderator"]), async (_req, res): Promise<void> => {
  const maps = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
    })
    .from(mapsTable)
    .orderBy(desc(mapsTable.views))
    .limit(10);

  res.json(maps);
});

router.get("/analytics/top-creators", requireRole(["admin", "super_admin", "moderator"]), async (_req, res): Promise<void> => {
  const creators = await db
    .select({
      id: creatorsTable.id,
      name: creatorsTable.name,
      totalMaps: creatorsTable.totalMaps,
      totalLikes: creatorsTable.totalLikes,
    })
    .from(creatorsTable)
    .orderBy(desc(creatorsTable.totalLikes))
    .limit(10);

  res.json(creators);
});

router.get("/analytics/activity-logs", requireRole(["admin", "super_admin"]), async (_req, res): Promise<void> => {
  const logs = await db
    .select({
      id: activityLogsTable.id,
      adminId: activityLogsTable.adminId,
      adminUsername: usersTable.username,
      action: activityLogsTable.action,
      targetType: activityLogsTable.targetType,
      targetId: activityLogsTable.targetId,
      details: activityLogsTable.details,
      createdAt: activityLogsTable.createdAt,
    })
    .from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.adminId, usersTable.id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(100);

  res.json(logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

export default router;
