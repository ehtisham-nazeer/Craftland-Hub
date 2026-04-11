import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creatorsTable = pgTable("creators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  banner: text("banner"),
  bio: text("bio"),
  region: text("region"),
  socialLink: text("social_link"),
  userId: text("user_id"),
  totalMaps: integer("total_maps").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  followerBoost: integer("follower_boost").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  pendingEdit: text("pending_edit"),
  pendingEditStatus: text("pending_edit_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreatorSchema = createInsertSchema(creatorsTable).omit({ id: true, createdAt: true });
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creatorsTable.$inferSelect;

export const mapsTable = pgTable("maps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  image: text("image"),
  mapLink: text("map_link"),
  creatorId: integer("creator_id").references(() => creatorsTable.id, { onDelete: "set null" }),
  likes: integer("likes").notNull().default(0),
  views: integer("views").notNull().default(0),
  region: text("region").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isTrending: boolean("is_trending").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  pendingEdit: text("pending_edit"),
  pendingEditStatus: text("pending_edit_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMapSchema = createInsertSchema(mapsTable).omit({ id: true, createdAt: true });
export type InsertMap = z.infer<typeof insertMapSchema>;
export type Map = typeof mapsTable.$inferSelect;
