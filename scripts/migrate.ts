import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "../db/client.js";

migrate(db, { migrationsFolder: "./drizzle" });