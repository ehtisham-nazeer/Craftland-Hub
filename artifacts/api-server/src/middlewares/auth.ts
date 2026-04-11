import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const ROLE_BY_EMAIL: Record<string, string> = {
  "ehtishamnazeer54@gmail.com": "super_admin",
  "ehtishamnazeeer@gmail.com": "moderator",
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  req.userId = auth?.userId ?? null;
  next();
}

export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.userId = userId;
    req.userRole = user.role;
    next();
  };
}

async function fetchEmailFromClerk(userId: string): Promise<string | undefined> {
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    return clerkUser.emailAddresses?.[0]?.emailAddress;
  } catch {
    return undefined;
  }
}

export async function ensureUserExists(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  if (!userId) return next();

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!existing) {
    const email = await fetchEmailFromClerk(userId);
    const role = (email && ROLE_BY_EMAIL[email]) ? ROLE_BY_EMAIL[email] : "user";

    await db
      .insert(usersTable)
      .values({ id: userId, email: email ?? null, role })
      .onConflictDoNothing();
  } else {
    let emailToUse = existing.email;
    let needsUpdate = false;
    const updates: { email?: string; role?: string } = {};

    if (!emailToUse) {
      const fetched = await fetchEmailFromClerk(userId);
      if (fetched) {
        emailToUse = fetched;
        updates.email = fetched;
        needsUpdate = true;
      }
    }

    if (emailToUse && ROLE_BY_EMAIL[emailToUse]) {
      const correctRole = ROLE_BY_EMAIL[emailToUse];
      if (existing.role !== correctRole) {
        updates.role = correctRole;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    }
  }

  next();
}
