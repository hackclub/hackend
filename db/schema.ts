import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const email_codes = sqliteTable("email_codes", {
    code: text("code").notNull(),
    uid: text("uid").notNull().references(() => users.id),
    action_data: text("action_data").notNull(),
    expires: integer("expires").notNull().default(sql`(unixepoch('now', '+15 minutes'))`)
}, table => ({
    pk: primaryKey({ columns: [table.code, table.uid] }),
}));

type Action = {
    type: "login"
}
export const action = (a: Action) => JSON.stringify(a);

export const users = sqliteTable("users", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid()),
    email: text("email").notNull().unique()
});

export const projects = sqliteTable("projects", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid()),
    uid: text("uid").notNull().references(() => users.id),
    data: text("data", { mode: "json" }).notNull()
});

export type EmailCodeRecord = typeof email_codes.$inferSelect;
export type InsertEmailCodeRecord = typeof email_codes.$inferInsert;
export type UserRecord = typeof users.$inferSelect;
export type InsertUserRecord = typeof users.$inferInsert;
export type ProjectRecord = typeof projects.$inferSelect;
export type InsertProjectRecord = typeof projects.$inferInsert;