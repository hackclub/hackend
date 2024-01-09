import { sqliteTable, text, integer, primaryKey, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateAutomergeUrl, urlPrefix } from "@automerge/automerge-repo/dist/AutomergeUrl.js";

export const email_codes = sqliteTable("email_codes", {
    code: text("code").notNull(),
    uid: text("uid").notNull().references(() => users.id),
    action_data: text("action_data").notNull(),
    expires: integer("expires").notNull().default(sql`(unixepoch('now', '+15 minutes'))`)
}, table => ({
    pk: primaryKey({ columns: [table.code, table.uid] }),
}));

export type Action = {
    type: "login"
} | {
    type: "change_email",
    new_email: string
};
export const action = (a: Action) => JSON.stringify(a);

export const users = sqliteTable("users", {
    id: text("id").primaryKey().notNull().$defaultFn(() => nanoid()),
    email: text("email").notNull().unique()
});

const generateProjectId = () => generateAutomergeUrl().replaceAll(urlPrefix, "");

export const projects = sqliteTable("projects", {
    id: text("id").primaryKey().notNull().$defaultFn(generateProjectId),
    uid: text("uid").notNull().references(() => users.id, { onDelete: "cascade" }),
    automerge_url: text("automerge_url").notNull()
});

export const project_aliases = sqliteTable("project_aliases", {
    id: text("id").primaryKey().notNull().$defaultFn(generateProjectId),
    project_id: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
});

export const automerge_storage = sqliteTable("automerge_storage", {
    keys: text("keys").notNull().primaryKey(),
    data: blob("data", { mode: "buffer" }).notNull()
})

// export type EmailCodeRecord = typeof email_codes.$inferSelect;
// export type InsertEmailCodeRecord = typeof email_codes.$inferInsert;
// export type UserRecord = typeof users.$inferSelect;
// export type InsertUserRecord = typeof users.$inferInsert;
// export type ProjectRecord = typeof projects.$inferSelect;
// export type InsertProjectRecord = typeof projects.$inferInsert;