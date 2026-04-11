import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import { commentsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { syncUserFromClerk } from "./users";

interface AuthenticatedRequest extends Request {
  userId: string | null;
}

const router: IRouter = Router();

router.get("/maps/:mapId/comments", optionalAuth, async (req, res): Promise<void> => {
  const raw = req.params.mapId as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const allComments = await db
    .select({
      id: commentsTable.id,
      mapId: commentsTable.mapId,
      userId: commentsTable.userId,
      content: commentsTable.content,
      parentId: commentsTable.parentId,
      createdAt: commentsTable.createdAt,
      username: usersTable.username,
      avatar: usersTable.avatar,
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.mapId, mapId))
    .orderBy(desc(commentsTable.createdAt));

  type RawComment = typeof allComments[number];
  type CommentWithReplies = Omit<RawComment, "createdAt"> & { createdAt: string; replies: CommentWithReplies[] };

  const rootComments = allComments.filter((c) => c.parentId == null);
  const replies = allComments.filter((c) => c.parentId != null);

  const threaded: CommentWithReplies[] = rootComments.map((comment) => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    replies: replies
      .filter((r) => r.parentId === comment.id)
      .map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), replies: [] })),
  }));

  res.json(threaded);
});

router.post("/maps/:mapId/comments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  // Sync user data from Clerk so username/avatar are always up to date
  await syncUserFromClerk(userId);

  const raw = req.params.mapId as string;
  const mapId = parseInt(raw, 10);
  if (isNaN(mapId)) { res.status(400).json({ error: "Invalid map id" }); return; }

  const { content, parentId } = req.body as { content?: string; parentId?: number | null };
  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const [comment] = await db.insert(commentsTable).values({ mapId, userId, content, parentId: parentId || null }).returning();

  const [user] = await db.select({ username: usersTable.username, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    username: user?.username || null,
    avatar: user?.avatar || null,
    replies: [],
  });
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const raw = req.params.id as string;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid comment id" }); return; }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }

  const isAdmin = user && ["admin", "super_admin", "moderator"].includes(user.role);
  if (comment.userId !== userId && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.sendStatus(204);
});

export default router;
