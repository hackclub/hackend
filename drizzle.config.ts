import "dotenv/config";
import type { Config } from "drizzle-kit";
// @ts-ignore - drizzle doesn't like importing it as js but our tsconfig doesn't like importing it as ts
import env from "./env.ts";

export default {
    schema: "./db/schema.ts",
    out: "./drizzle",
    driver: "better-sqlite",
    dbCredentials: {
        url: env.DB_PATH
    }
} satisfies Config;