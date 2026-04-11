import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  creatorsTable,
  mapsTable,
  followsTable,
  usersTable,
  activityLogsTable,
  creatorApplicationsTable,
} from "@workspace/db";
import { eq, desc, ilike, and, sql, isNotNull, count as drizzleCount } from "drizzle-orm";
import { requireAuth, optionalAuth, requireRole } from "../middlewares/auth";




const router: IRouter = Router();

/** Compute live aggregates (totalLikes, totalMaps, totalViews) for a creator from the maps table */
async function liveCreatorStats(creatorId: number): Promise<{ totalLikes: number; totalMaps: number; totalViews: number }> {
  const [agg] = await db
    .select({
      totalLikes: sql<number>`COALESCE(SUM(${mapsTable.likes}), 0)`,
      totalMaps: sql<number>`COUNT(${mapsTable.id})`,
      totalViews: sql<number>`COALESCE(SUM(${mapsTable.views}), 0)`,
    })
    .from(mapsTable)
    .where(eq(mapsTable.creatorId, creatorId));
  return {
    totalLikes: Number(agg?.totalLikes ?? 0),
    totalMaps: Number(agg?.totalMaps ?? 0),
    totalViews: Number(agg?.totalViews ?? 0),
  };
}

async function getFollowersCount(creatorId: number): Promise<number> {
  const [[{ cnt }], [creator]] = await Promise.all([
    db.select({ cnt: sql<number>`count(*)` }).from(followsTable).where(eq(followsTable.creatorId, creatorId)),
    db.select({ followerBoost: creatorsTable.followerBoost }).from(creatorsTable).where(eq(creatorsTable.id, creatorId)),
  ]);
  return Math.max(0, Number(cnt) + (creator?.followerBoost ?? 0));
}

async function getCreatorWithStatus(creatorId: number, userId: string | null) {
  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, creatorId));
  if (!creator) return null;

  let isFollowed = false;
  if (userId) {
    const [follow] = await db.select().from(followsTable).where(and(eq(followsTable.userId, userId), eq(followsTable.creatorId, creatorId)));
    isFollowed = !!follow;
  }

  const [stats, followersCount] = await Promise.all([
    liveCreatorStats(creatorId),
    getFollowersCount(creatorId),
  ]);

  return { ...creator, ...stats, followersCount, createdAt: creator.createdAt.toISOString(), isFollowed };
}

router.get("/creators", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const { search } = req.query as { search?: string };

  // Only show creators linked to a real Clerk account (via application approval).
  // Ghost profiles created by old map-submission logic have userId = null and are excluded.
  const baseFilter = isNotNull(creatorsTable.userId);
  const creators = await db.select().from(creatorsTable).where(
    search ? and(baseFilter, ilike(creatorsTable.name, `%${search}%`)) : baseFilter
  );

  const result = await Promise.all(
    creators.map(async (c) => {
      const [stats, follow, followersCount] = await Promise.all([
        liveCreatorStats(c.id),
        userId
          ? db.select().from(followsTable).where(and(eq(followsTable.userId, userId), eq(followsTable.creatorId, c.id)))
          : Promise.resolve([] as typeof followsTable.$inferSelect[]),
        getFollowersCount(c.id),
      ]);
      return { ...c, ...stats, followersCount, createdAt: c.createdAt.toISOString(), isFollowed: (follow as typeof followsTable.$inferSelect[]).length > 0 };
    })
  );

  // Sort by live totalLikes desc
  result.sort((a, b) => b.totalLikes - a.totalLikes);
  res.json(result);
});

router.post("/creators", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { name, logo, banner, bio, region } = req.body as {
    name?: string;
    logo?: string | null;
    banner?: string | null;
    bio?: string | null;
    region?: string | null;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [creator] = await db.insert(creatorsTable).values({
    name,
    logo: logo ?? null,
    banner: banner ?? null,
    bio: bio ?? null,
    region: region ?? null,
  }).returning();

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "create_creator",
    targetType: "creator",
    targetId: creator.id,
    details: `Created creator: ${name}`,
  });

  res.status(201).json({ ...creator, createdAt: creator.createdAt.toISOString(), isFollowed: false });
});

// IMPORTANT: literal sub-paths (/me, /pending-edits) MUST be before /creators/:id
// to avoid Express matching them as the :id parameter.

router.get("/creators/pending-edits", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const { isNotNull } = await import("drizzle-orm");
  const creators = await db
    .select()
    .from(creatorsTable)
    .where(isNotNull(creatorsTable.pendingEdit))
    .orderBy(desc(creatorsTable.createdAt));
  res.json(creators.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), isFollowed: false })));
});

router.get("/creators/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  // First try direct userId match (most reliable)
  const [byUserId] = await db
    .select()
    .from(creatorsTable)
    .where(eq(creatorsTable.userId, userId));
  if (byUserId) {
    res.json({ ...byUserId, createdAt: byUserId.createdAt.toISOString(), isFollowed: false });
    return;
  }

  // Fall back to matching via approved creator application name
  const [app] = await db
    .select()
    .from(creatorApplicationsTable)
    .where(and(eq(creatorApplicationsTable.userId, userId), eq(creatorApplicationsTable.status, "approved")));
  if (!app) { res.status(404).json({ error: "No approved creator profile linked to this account" }); return; }

  const [creator] = await db
    .select()
    .from(creatorsTable)
    .where(sql`lower(${creatorsTable.name}) = lower(${app.inGameName})`);
  if (!creator) { res.status(404).json({ error: "Creator profile not found" }); return; }

  // Back-fill the userId so next lookup is direct
  await db.update(creatorsTable).set({ userId }).where(eq(creatorsTable.id, creator.id));

  res.json({ ...creator, userId, createdAt: creator.createdAt.toISOString(), isFollowed: false });
});

router.patch("/creators/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [app] = await db
    .select()
    .from(creatorApplicationsTable)
    .where(and(eq(creatorApplicationsTable.userId, userId), eq(creatorApplicationsTable.status, "approved")));
  if (!app) { res.status(403).json({ error: "No approved creator profile linked to this account" }); return; }

  const [creator] = await db
    .select()
    .from(creatorsTable)
    .where(sql`lower(${creatorsTable.name}) = lower(${app.inGameName})`);
  if (!creator) { res.status(404).json({ error: "Creator profile not found" }); return; }

  const { bio, socialLink, logo, banner } = req.body as {
    bio?: string | null;
    socialLink?: string | null;
    logo?: string | null;
    banner?: string | null;
  };

  const pendingData: Record<string, string | null | undefined> = {};
  if (bio !== undefined) pendingData.bio = bio;
  if (socialLink !== undefined) pendingData.socialLink = socialLink;
  if (logo !== undefined) pendingData.logo = logo;
  if (banner !== undefined) pendingData.banner = banner;

  const [updated] = await db
    .update(creatorsTable)
    .set({
      pendingEdit: JSON.stringify(pendingData),
      pendingEditStatus: "pending",
    })
    .where(eq(creatorsTable.id, creator.id))
    .returning();

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString(), isFollowed: false });
});

router.get("/creators/:id", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const creator = await getCreatorWithStatus(id, userId);
  if (!creator) { res.status(404).json({ error: "Creator not found" }); return; }
  res.json(creator);
});

router.patch("/creators/:id", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const { name, logo, banner, bio, region, socialLink, isVerified } = req.body as {
    name?: string;
    logo?: string | null;
    banner?: string | null;
    bio?: string | null;
    region?: string | null;
    socialLink?: string | null;
    isVerified?: boolean;
  };

  const updates: Partial<{
    name: string;
    logo: string | null;
    banner: string | null;
    bio: string | null;
    region: string | null;
    socialLink: string | null;
    isVerified: boolean;
  }> = {};
  if (name != null) updates.name = name;
  if (logo !== undefined) updates.logo = logo;
  if (banner !== undefined) updates.banner = banner;
  if (bio !== undefined) updates.bio = bio;
  if (region !== undefined) updates.region = region;
  if (socialLink !== undefined) updates.socialLink = socialLink;
  if (isVerified !== undefined) updates.isVerified = isVerified;

  const [creator] = await db.update(creatorsTable).set(updates).where(eq(creatorsTable.id, id)).returning();
  if (!creator) { res.status(404).json({ error: "Creator not found" }); return; }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "update_creator",
    targetType: "creator",
    targetId: id,
    details: `Updated creator: ${creator.name}`,
  });

  res.json({ ...creator, createdAt: creator.createdAt.toISOString(), isFollowed: false });
});

router.post("/creators/:id/approve-edit", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, id));
  if (!creator) { res.status(404).json({ error: "Creator not found" }); return; }
  if (!creator.pendingEdit || creator.pendingEditStatus !== "pending") {
    res.status(400).json({ error: "No pending edit to approve" }); return;
  }

  let pendingData: Record<string, string | null> = {};
  try { pendingData = JSON.parse(creator.pendingEdit); } catch { /* ignore */ }

  const updates: Partial<{
    bio: string | null;
    socialLink: string | null;
    logo: string | null;
    banner: string | null;
    pendingEdit: null;
    pendingEditStatus: null;
  }> = {
    pendingEdit: null,
    pendingEditStatus: null,
  };
  if ("bio" in pendingData) updates.bio = pendingData.bio;
  if ("socialLink" in pendingData) updates.socialLink = pendingData.socialLink;
  if ("logo" in pendingData) updates.logo = pendingData.logo;
  if ("banner" in pendingData) updates.banner = pendingData.banner;

  const [updated] = await db.update(creatorsTable).set(updates).where(eq(creatorsTable.id, id)).returning();

  await db.insert(activityLogsTable).values({
    adminId,
    action: "approve_creator_edit",
    targetType: "creator",
    targetId: id,
    details: `Approved profile edit for creator: ${creator.name}`,
  });

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString(), isFollowed: false });
});

router.post("/creators/:id/reject-edit", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, id));
  if (!creator) { res.status(404).json({ error: "Creator not found" }); return; }

  const [updated] = await db
    .update(creatorsTable)
    .set({ pendingEdit: null, pendingEditStatus: null })
    .where(eq(creatorsTable.id, id))
    .returning();

  await db.insert(activityLogsTable).values({
    adminId,
    action: "reject_creator_edit",
    targetType: "creator",
    targetId: id,
    details: `Rejected profile edit for creator: ${creator.name}`,
  });

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString(), isFollowed: false });
});

router.patch("/creators/:id/follower-boost", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }
  const boost = parseInt(req.body.boost, 10);
  if (isNaN(boost)) { res.status(400).json({ error: "boost must be an integer" }); return; }
  const [updated] = await db.update(creatorsTable).set({ followerBoost: boost }).where(eq(creatorsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Creator not found" }); return; }
  const followersCount = await getFollowersCount(id);
  res.json({ followersCount });
});

router.delete("/creators/:id", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const [creator] = await db.delete(creatorsTable).where(eq(creatorsTable.id, id)).returning();
  if (!creator) { res.status(404).json({ error: "Creator not found" }); return; }

  // Reset all approved applications for this creator's userId so they can re-apply.
  // Without this, the "approved" application blocks re-application indefinitely.
  if (creator.userId) {
    await db
      .update(creatorApplicationsTable)
      .set({
        status: "rejected",
        rejectionReason: "Creator profile was deleted. You may reapply.",
      })
      .where(
        and(
          eq(creatorApplicationsTable.userId, creator.userId),
          eq(creatorApplicationsTable.status, "approved")
        )
      );
  }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "delete_creator",
    targetType: "creator",
    targetId: id,
    details: `Deleted creator: ${creator.name}`,
  });

  res.sendStatus(204);
});

router.get("/creators/:id/maps", optionalAuth, async (req, res): Promise<void> => {
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const maps = await db
    .select()
    .from(mapsTable)
    .where(eq(mapsTable.creatorId, id))
    .orderBy(desc(mapsTable.createdAt));

  const result = maps.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    isLiked: false,
    isBookmarked: false,
    creatorName: null,
    creatorLogo: null,
  }));
  res.json(result);
});

router.post("/creators/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const raw = req.params.id as string;
  const creatorId = parseInt(raw, 10);
  if (isNaN(creatorId)) { res.status(400).json({ error: "Invalid creator id" }); return; }

  const [existing] = await db.select().from(followsTable).where(and(eq(followsTable.userId, userId), eq(followsTable.creatorId, creatorId)));

  if (existing) {
    await db.delete(followsTable).where(and(eq(followsTable.userId, userId), eq(followsTable.creatorId, creatorId)));
  } else {
    await db.insert(followsTable).values({ userId, creatorId });
  }

  const followersCount = await getFollowersCount(creatorId);
  res.json({ following: !existing, followersCount });
});

export default router;
