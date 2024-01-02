import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import env from "../env.js";

const sqlite = new Database(env.DB_PATH);
export const db = drizzle(sqlite);