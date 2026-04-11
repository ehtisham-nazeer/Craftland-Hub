import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  mapsTable,
  creatorsTable,
  likesTable,
  bookmarksTable,
  usersTable,
  activityLogsTable,
  creatorApplicationsTable,
} from "@workspace/db";
import { eq, desc, and, or, ilike, sql, isNotNull } from "drizzle-orm";
import { requireAuth, optionalAuth, requireRole } from "../middlewares/auth";




const router: IRouter = Router();

async function getMapWithStatus(mapId: number, userId: string | null) {
  const [map] = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      mapLink: mapsTable.mapLink,
      creatorId: mapsTable.creatorId,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
      isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending,
      isPinned: mapsTable.isPinned,
      isVerified: mapsTable.isVerified,
      createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name,
      creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(eq(mapsTable.id, mapId));

  if (!map) return null;

  let isLiked = false;
  let isBookmarked = false;

  if (userId) {
    const [likeRow] = await db
      .select()
      .from(likesTable)
      .where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, mapId)));
    isLiked = !!likeRow;

    const [bookmark] = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, mapId)));
    isBookmarked = !!bookmark;
  }

  return {
    ...map,
    createdAt: map.createdAt.toISOString(),
    isLiked,
    isBookmarked,
  };
}

router.get("/maps", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const { search, region, sort, page, limit } = req.query as {
    search?: string;
    region?: string;
    sort?: string;
    page?: string;
    limit?: string;
  };
  const pageNum = parseInt(page ?? "1", 10) || 1;
  const limitNum = Math.min(parseInt(limit ?? "20", 10) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      mapLink: mapsTable.mapLink,
      creatorId: mapsTable.creatorId,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
      isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending,
      isPinned: mapsTable.isPinned,
      isVerified: mapsTable.isVerified,
      createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name,
      creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .$dynamic();

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(mapsTable.name, `%${search}%`),
        ilike(mapsTable.code, `%${search}%`),
        ilike(creatorsTable.name, `%${search}%`),
      )
    );
  }
  if (region) {
    conditions.push(eq(mapsTable.region, region));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .$dynamic();
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions));
  }

  const [{ count }] = await countQuery;
  const total = Number(count);

  if (sort === "most_liked") {
    query = query.orderBy(desc(mapsTable.isPinned), desc(mapsTable.likes));
  } else if (sort === "trending") {
    query = query.orderBy(desc(mapsTable.isPinned), desc(mapsTable.isTrending), desc(mapsTable.views));
  } else {
    query = query.orderBy(desc(mapsTable.isPinned), desc(mapsTable.createdAt));
  }

  const maps = await query.limit(limitNum).offset(offset);

  const result = await Promise.all(
    maps.map(async (map) => {
      let isLiked = false;
      let isBookmarked = false;
      if (userId) {
        const [likeRow] = await db
          .select()
          .from(likesTable)
          .where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, map.id)));
        isLiked = !!likeRow;
        const [bmRow] = await db
          .select()
          .from(bookmarksTable)
          .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, map.id)));
        isBookmarked = !!bmRow;
      }
      return { ...map, createdAt: map.createdAt.toISOString(), isLiked, isBookmarked };
    })
  );

  res.json({ maps: result, total, page: pageNum, limit: limitNum });
});

router.get("/maps/featured", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const maps = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      mapLink: mapsTable.mapLink,
      creatorId: mapsTable.creatorId,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
      isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending,
      isPinned: mapsTable.isPinned,
      isVerified: mapsTable.isVerified,
      createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name,
      creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(eq(mapsTable.isFeatured, true))
    .orderBy(desc(mapsTable.createdAt))
    .limit(5);

  const result = await Promise.all(
    maps.map(async (map) => {
      let isLiked = false;
      let isBookmarked = false;
      if (userId) {
        const [likeRow] = await db.select().from(likesTable).where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, map.id)));
        isLiked = !!likeRow;
        const [bmRow] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, map.id)));
        isBookmarked = !!bmRow;
      }
      return { ...map, createdAt: map.createdAt.toISOString(), isLiked, isBookmarked };
    })
  );
  res.json(result);
});

router.get("/maps/trending", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const maps = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      mapLink: mapsTable.mapLink,
      creatorId: mapsTable.creatorId,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
      isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending,
      isPinned: mapsTable.isPinned,
      isVerified: mapsTable.isVerified,
      createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name,
      creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(eq(mapsTable.isTrending, true))
    .orderBy(desc(mapsTable.views))
    .limit(8);

  const result = await Promise.all(
    maps.map(async (map) => {
      let isLiked = false;
      let isBookmarked = false;
      if (userId) {
        const [likeRow] = await db.select().from(likesTable).where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, map.id)));
        isLiked = !!likeRow;
        const [bmRow] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, map.id)));
        isBookmarked = !!bmRow;
      }
      return { ...map, createdAt: map.createdAt.toISOString(), isLiked, isBookmarked };
    })
  );
  res.json(result);
});

router.get("/maps/most-liked", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const maps = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      mapLink: mapsTable.mapLink,
      creatorId: mapsTable.creatorId,
      likes: mapsTable.likes,
      views: mapsTable.views,
      region: mapsTable.region,
      isFeatured: mapsTable.isFeatured,
      isTrending: mapsTable.isTrending,
      isPinned: mapsTable.isPinned,
      isVerified: mapsTable.isVerified,
      createdAt: mapsTable.createdAt,
      creatorName: creatorsTable.name,
      creatorLogo: creatorsTable.logo,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .orderBy(desc(mapsTable.likes))
    .limit(8);

  const result = await Promise.all(
    maps.map(async (map) => {
      let isLiked = false;
      let isBookmarked = false;
      if (userId) {
        const [likeRow] = await db.select().from(likesTable).where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, map.id)));
        isLiked = !!likeRow;
        const [bmRow] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, map.id)));
        isBookmarked = !!bmRow;
      }
      return { ...map, createdAt: map.createdAt.toISOString(), isLiked, isBookmarked };
    })
  );
  res.json(result);
});

// Must be BEFORE /maps/:id to avoid Express matching "pending-edits" as :id
router.get("/maps/pending-edits", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const maps = await db
    .select({
      id: mapsTable.id,
      name: mapsTable.name,
      code: mapsTable.code,
      image: mapsTable.image,
      region: mapsTable.region,
      pendingEdit: mapsTable.pendingEdit,
      pendingEditStatus: mapsTable.pendingEditStatus,
      creatorName: creatorsTable.name,
      createdAt: mapsTable.createdAt,
    })
    .from(mapsTable)
    .leftJoin(creatorsTable, eq(mapsTable.creatorId, creatorsTable.id))
    .where(isNotNull(mapsTable.pendingEdit))
    .orderBy(desc(mapsTable.createdAt));

  res.json(maps.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.get("/maps/:id", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid map id" });
    return;
  }
  const map = await getMapWithStatus(id, userId);
  if (!map) {
    res.status(404).json({ error: "Map not found" });
    return;
  }
  res.json(map);
});

router.post("/maps", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { name, code, image, mapLink, creatorId, region, isFeatured, isTrending } = req.body as {
    name?: string;
    code?: string;
    image?: string | null;
    mapLink?: string | null;
    creatorId?: number | null;
    region?: string;
    isFeatured?: boolean;
    isTrending?: boolean;
  };
  if (!name || !code || !region) {
    res.status(400).json({ error: "name, code, region are required" });
    return;
  }
  const [map] = await db.insert(mapsTable).values({
    name, code, image: image ?? null, mapLink: mapLink ?? null,
    creatorId: creatorId ?? null, region,
    isFeatured: isFeatured ?? false,
    isTrending: isTrending ?? false,
  }).returning();

  if (creatorId) {
    await db.execute(sql`UPDATE creators SET total_maps = total_maps + 1 WHERE id = ${creatorId}`);
  }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "create_map",
    targetType: "map",
    targetId: map.id,
    details: `Created map: ${name}`,
  });

  res.status(201).json({ ...map, createdAt: map.createdAt.toISOString(), isLiked: false, isBookmarked: false, creatorName: null, creatorLogo: null });
});

router.patch("/maps/:id", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const { name, code, image, mapLink, creatorId, region, isFeatured, isTrending, isPinned, isVerified } = req.body as {
    name?: string;
    code?: string;
    image?: string | null;
    mapLink?: string | null;
    creatorId?: number | null;
    region?: string;
    isFeatured?: boolean;
    isTrending?: boolean;
    isPinned?: boolean;
    isVerified?: boolean;
  };

  const updates: Partial<{
    name: string;
    code: string;
    image: string | null;
    mapLink: string | null;
    creatorId: number | null;
    region: string;
    isFeatured: boolean;
    isTrending: boolean;
    isPinned: boolean;
    isVerified: boolean;
  }> = {};
  if (name != null) updates.name = name;
  if (code != null) updates.code = code;
  if (image !== undefined) updates.image = image;
  if (mapLink !== undefined) updates.mapLink = mapLink;
  if (creatorId !== undefined) updates.creatorId = creatorId;
  if (region != null) updates.region = region;
  if (isFeatured != null) updates.isFeatured = isFeatured;
  if (isTrending != null) updates.isTrending = isTrending;
  if (isPinned != null) updates.isPinned = isPinned;
  if (isVerified != null) updates.isVerified = isVerified;

  const [map] = await db.update(mapsTable).set(updates).where(eq(mapsTable.id, id)).returning();
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "update_map",
    targetType: "map",
    targetId: id,
    details: `Updated map: ${map.name}`,
  });

  res.json({ ...map, createdAt: map.createdAt.toISOString(), isLiked: false, isBookmarked: false, creatorName: null, creatorLogo: null });
});

router.delete("/maps/:id", requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const [map] = await db.delete(mapsTable).where(eq(mapsTable.id, id)).returning();
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "delete_map",
    targetType: "map",
    targetId: id,
    details: `Deleted map: ${map.name}`,
  });

  res.sendStatus(204);
});

router.post("/maps/:id/like", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const [existing] = await db.select().from(likesTable).where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, mapId)));

  const [mapRow] = await db.select({ creatorId: mapsTable.creatorId }).from(mapsTable).where(eq(mapsTable.id, mapId));
  if (!mapRow) { res.status(404).json({ error: "Map not found" }); return; }

  let liked: boolean;
  if (existing) {
    await db.delete(likesTable).where(and(eq(likesTable.userId, userId), eq(likesTable.mapId, mapId)));
    await db.execute(sql`UPDATE maps SET likes = GREATEST(0, likes - 1) WHERE id = ${mapId}`);
    if (mapRow.creatorId) {
      await db.execute(sql`UPDATE creators SET total_likes = GREATEST(0, total_likes - 1) WHERE id = ${mapRow.creatorId}`);
    }
    liked = false;
  } else {
    await db.insert(likesTable).values({ userId, mapId });
    await db.execute(sql`UPDATE maps SET likes = likes + 1 WHERE id = ${mapId}`);
    if (mapRow.creatorId) {
      await db.execute(sql`UPDATE creators SET total_likes = total_likes + 1 WHERE id = ${mapRow.creatorId}`);
    }
    liked = true;
  }

  const [map] = await db.select({ likes: mapsTable.likes }).from(mapsTable).where(eq(mapsTable.id, mapId));
  res.json({ liked, likes: map?.likes ?? 0 });
});

router.post("/maps/:id/bookmark", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();

  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const [existing] = await db.select().from(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, mapId)));

  if (existing) {
    await db.delete(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.mapId, mapId)));
    res.json({ bookmarked: false });
  } else {
    await db.insert(bookmarksTable).values({ userId, mapId });
    res.json({ bookmarked: true });
  }
});

router.post("/maps/:id/view", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.userId ?? null;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  await db.execute(sql`UPDATE maps SET views = views + 1 WHERE id = ${mapId}`);

  if (userId) {
    await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
    await db.execute(sql`
      INSERT INTO recently_viewed (user_id, map_id, viewed_at) 
      VALUES (${userId}, ${mapId}, NOW())
      ON CONFLICT DO NOTHING
    `);
    await db.execute(sql`
      DELETE FROM recently_viewed 
      WHERE id NOT IN (
        SELECT id FROM recently_viewed WHERE user_id = ${userId} 
        ORDER BY viewed_at DESC LIMIT 20
      ) AND user_id = ${userId}
    `);
  }

  res.json({ success: true });
});

router.post("/maps/:id/adjust-likes", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const { delta } = req.body as { delta?: unknown };
  const deltaNum = parseInt(String(delta), 10);
  if (isNaN(deltaNum)) { res.status(400).json({ error: "delta must be an integer" }); return; }

  await db.execute(sql`UPDATE maps SET likes = GREATEST(0, likes + ${deltaNum}) WHERE id = ${mapId}`);

  // Sync creator's totalLikes from actual map data
  const [mapRow] = await db.select({ creatorId: mapsTable.creatorId }).from(mapsTable).where(eq(mapsTable.id, mapId));
  if (mapRow?.creatorId) {
    const [agg] = await db
      .select({ total: sql<number>`COALESCE(SUM(likes), 0)` })
      .from(mapsTable)
      .where(eq(mapsTable.creatorId, mapRow.creatorId));
    await db.update(creatorsTable).set({ totalLikes: agg?.total ?? 0 }).where(eq(creatorsTable.id, mapRow.creatorId));
  }

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "adjust_likes",
    targetType: "map",
    targetId: mapId,
    details: `Adjusted likes by ${deltaNum}`,
  });

  const map = await getMapWithStatus(mapId, null);
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }
  res.json(map);
});

router.post("/maps/:id/adjust-views", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const { delta } = req.body as { delta?: unknown };
  const deltaNum = parseInt(String(delta), 10);
  if (isNaN(deltaNum)) { res.status(400).json({ error: "delta must be an integer" }); return; }

  await db.execute(sql`UPDATE maps SET views = GREATEST(0, views + ${deltaNum}) WHERE id = ${mapId}`);

  await db.insert(activityLogsTable).values({
    adminId: userId,
    action: "adjust_views",
    targetType: "map",
    targetId: mapId,
    details: `Adjusted views by ${deltaNum}`,
  });

  const map = await getMapWithStatus(mapId, null);
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }
  res.json(map);
});

// Creator submits an edit request for one of their own maps
router.post("/maps/:id/submit-edit", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  // Verify the map belongs to this user's creator profile
  const [app] = await db
    .select()
    .from(creatorApplicationsTable)
    .where(and(eq(creatorApplicationsTable.userId, userId), eq(creatorApplicationsTable.status, "approved")));
  if (!app) { res.status(403).json({ error: "No approved creator profile linked to this account" }); return; }

  const [creator] = await db
    .select()
    .from(creatorsTable)
    .where(sql`lower(${creatorsTable.name}) = lower(${app.inGameName})`);
  if (!creator) { res.status(403).json({ error: "Creator profile not found" }); return; }

  const [map] = await db.select().from(mapsTable).where(eq(mapsTable.id, mapId));
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }
  if (map.creatorId !== creator.id) { res.status(403).json({ error: "You can only edit your own maps" }); return; }

  const { name, code, image, mapLink, region } = req.body as {
    name?: string;
    code?: string;
    image?: string | null;
    mapLink?: string | null;
    region?: string;
  };

  const pendingData: Record<string, string | null | undefined> = {};
  if (name !== undefined) pendingData.name = name;
  if (code !== undefined) pendingData.code = code;
  if (image !== undefined) pendingData.image = image;
  if (mapLink !== undefined) pendingData.mapLink = mapLink;
  if (region !== undefined) pendingData.region = region;

  const [updated] = await db
    .update(mapsTable)
    .set({ pendingEdit: JSON.stringify(pendingData), pendingEditStatus: "pending" })
    .where(eq(mapsTable.id, mapId))
    .returning();

  res.json({ ...updated!, createdAt: updated!.createdAt.toISOString(), isLiked: false, isBookmarked: false, creatorName: creator.name, creatorLogo: creator.logo ?? null });
});

// Admin/moderator approves a pending map edit
router.post("/maps/:id/approve-edit", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const [map] = await db.select().from(mapsTable).where(eq(mapsTable.id, mapId));
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }
  if (!map.pendingEdit || map.pendingEditStatus !== "pending") {
    res.status(400).json({ error: "No pending edit to approve" }); return;
  }

  let pendingData: Record<string, string | null> = {};
  try { pendingData = JSON.parse(map.pendingEdit); } catch { /* ignore */ }

  const updates: Partial<{
    name: string;
    code: string;
    image: string | null;
    mapLink: string | null;
    region: string;
    pendingEdit: null;
    pendingEditStatus: null;
  }> = {
    pendingEdit: null,
    pendingEditStatus: null,
  };
  if (pendingData.name) updates.name = pendingData.name;
  if (pendingData.code) updates.code = pendingData.code;
  if ("image" in pendingData) updates.image = pendingData.image;
  if ("mapLink" in pendingData) updates.mapLink = pendingData.mapLink;
  if (pendingData.region) updates.region = pendingData.region;

  const [updated] = await db.update(mapsTable).set(updates).where(eq(mapsTable.id, mapId)).returning();

  await db.insert(activityLogsTable).values({
    adminId,
    action: "approve_map_edit",
    targetType: "map",
    targetId: mapId,
    details: `Approved map edit for: ${map.name}`,
  });

  const result = await getMapWithStatus(mapId, null);
  res.json(result);
});

// Admin/moderator rejects a pending map edit
router.post("/maps/:id/reject-edit", requireRole(["admin", "super_admin", "moderator"]), async (req, res): Promise<void> => {
  const adminId = req.userId!;
  const raw = req.params.id as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const [map] = await db.select().from(mapsTable).where(eq(mapsTable.id, mapId));
  if (!map) { res.status(404).json({ error: "Map not found" }); return; }

  await db.update(mapsTable).set({ pendingEdit: null, pendingEditStatus: null }).where(eq(mapsTable.id, mapId));

  await db.insert(activityLogsTable).values({
    adminId,
    action: "reject_map_edit",
    targetType: "map",
    targetId: mapId,
    details: `Rejected map edit for: ${map.name}`,
  });

  const result = await getMapWithStatus(mapId, null);
  res.json(result);
});

export default router;
