import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mapsTable,
  creatorsTable,
  likesTable,
  bookmarksTable,
  followsTable,
  recentlyViewedTable,
  submissionsTable,
  creatorApplicationsTable,
  activityLogsTable,
} from "@workspace/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { requireAuth, requireRole, ROLE_BY_EMAIL } from "../middlewares/auth";
import { clerkClient } from "@clerk/express";

interface AuthenticatedRequest extends Request {
  userId: string;
}

const router: IRouter = Router();

export async function syncUserFromClerk(userId: string): Promise<void> {
  let email: string | undefined;
  let username: string | undefined;
  let avatar: string | undefined;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    username = clerkUser.username ?? fullName ?? undefined;
    avatar = clerkUser.imageUrl ?? undefined;
  } catch {
    // Clerk lookup failed — continue with no data
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!existing) {
    const role = (email && ROLE_BY_EMAIL[email]) ? ROLE_BY_EMAIL[email] : "user";
    await db
      .insert(usersTable)
      .values({ id: userId, email: email ?? null, role, username: username ?? null, avatar: avatar ?? null })
      .onConflictDoNothing();
    return;
  }

  const updates: { email?: string; role?: string; username?: string; avatar?: string } = {};
  const emailToUse = existing.email || email;
  if (!existing.email && email) updates.email = email;
  if (emailToUse && ROLE_BY_EMAIL[emailToUse] && existing.role !== ROLE_BY_EMAIL[emailToUse]) {
    updates.role = ROLE_BY_EMAIL[emailToUse];
  }
  // Always keep username/avatar fresh from Clerk
  if (username && existing.username !== username) updates.username = username;
  if (avatar && existing.avatar !== avatar) updates.avatar = avatar;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  }
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await syncUserFromClerk(userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...user, createdAt: user.createdAt.toISOString() });
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const { username, avatar } = req.body as { username?: string; avatar?: string | null };
  const updates: { username?: string; avatar?: string | null } = {};
  if (username != null) updates.username = username;
  if (avatar !== undefined) updates.avatar = avatar;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...user, createdAt: user.createdAt.toISOString() });
});

router.get("/users/me/liked-maps", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const likes = await db
    .select({ mapId: likesTable.mapId })
    .from(likesTable)
    .where(eq(likesTable.userId, userId))
    .orderBy(desc(likesTable.createdAt));

  if (likes.length === 0) { res.json([]); return; }

  const mapIds = likes.map((l) => l.mapId);
  const maps = await db
    .select({
      id: mapsTable.id, name: mapsTable.name, code: mapsTable.code, image: mapsTable.image,
      mapLink: mapsTable.mapLink, creatorId: mapsTable.creatorId, likes: mapsTable.likes,
      views: mapsTable.views, region: mapsTable.region, isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending, createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name, creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(inArray(mapsTable.id, mapIds));

  res.json(maps.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), isLiked: true, isBookmarked: false })));
});

router.get("/users/me/bookmarked-maps", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const bookmarks = await db
    .select({ mapId: bookmarksTable.mapId })
    .from(bookmarksTable)
    .where(eq(bookmarksTable.userId, userId))
    .orderBy(desc(bookmarksTable.createdAt));

  if (bookmarks.length === 0) { res.json([]); return; }

  const mapIds = bookmarks.map((b) => b.mapId);
  const maps = await db
    .select({
      id: mapsTable.id, name: mapsTable.name, code: mapsTable.code, image: mapsTable.image,
      mapLink: mapsTable.mapLink, creatorId: mapsTable.creatorId, likes: mapsTable.likes,
      views: mapsTable.views, region: mapsTable.region, isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending, createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name, creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(inArray(mapsTable.id, mapIds));

  res.json(maps.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), isLiked: false, isBookmarked: true })));
});

router.get("/users/me/submissions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.submittedByUserId, userId))
    .orderBy(desc(submissionsTable.createdAt));

  res.json(submissions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.get("/users/me/followed-creators", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const follows = await db
    .select({ creatorId: followsTable.creatorId })
    .from(followsTable)
    .where(eq(followsTable.userId, userId));

  if (follows.length === 0) { res.json([]); return; }

  const creatorIds = follows.map((f) => f.creatorId);
  const creators = await db.select().from(creatorsTable).where(inArray(creatorsTable.id, creatorIds));
  res.json(creators.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), isFollowed: true })));
});

router.get("/users/me/recently-viewed", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const views = await db
    .select({ mapId: recentlyViewedTable.mapId })
    .from(recentlyViewedTable)
    .where(eq(recentlyViewedTable.userId, userId))
    .orderBy(desc(recentlyViewedTable.viewedAt))
    .limit(20);

  if (views.length === 0) { res.json([]); return; }

  const mapIds = views.map((v) => v.mapId);
  const maps = await db
    .select({
      id: mapsTable.id, name: mapsTable.name, code: mapsTable.code, image: mapsTable.image,
      mapLink: mapsTable.mapLink, creatorId: mapsTable.creatorId, likes: mapsTable.likes,
      views: mapsTable.views, region: mapsTable.region, isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending, createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name, creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(inArray(mapsTable.id, mapIds));

  res.json(maps.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), isLiked: false, isBookmarked: false })));
});

router.get("/users", requireRole(["admin", "super_admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
});


router.patch("/users/:id/role", requireRole(["super_admin"]), async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const { role } = req.body as { role?: string };
  const allowed = ["user", "moderator", "admin", "super_admin"];
  if (!role || !allowed.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${allowed.join(", ")}` });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// ── Ban user: delete their submissions, creator application, creator profile + maps, and the user record ──
router.delete("/users/:id/ban", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const { id } = req.params as { id: string };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Delete their pending/rejected submissions
  await db.delete(submissionsTable).where(eq(submissionsTable.submittedByUserId, id));

  // Delete their creator applications
  await db.delete(creatorApplicationsTable).where(eq(creatorApplicationsTable.userId, id));

  // Delete their creator profile (and associated maps)
  const [creator] = await db.select({ id: creatorsTable.id }).from(creatorsTable).where(eq(creatorsTable.userId, id));
  if (creator) {
    await db.delete(mapsTable).where(eq(mapsTable.creatorId, creator.id));
    await db.delete(creatorsTable).where(eq(creatorsTable.id, creator.id));
  }

  // Delete the user
  await db.delete(usersTable).where(eq(usersTable.id, id));

  await db.insert(activityLogsTable).values({
    adminId,
    action: "ban_user",
    targetType: "user",
    targetId: 0,
    details: `Banned and deleted user ${id} (${user.email ?? user.username ?? "unknown"}) and all their data`,
  });

  res.json({ success: true, userId: id });
});

export default router;
