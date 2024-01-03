import "dotenv/config";
import type { Config } from "drizzle-kit";
import env from "./env.js";

export default {
    schema: "./db/schema.ts",
    out: "./drizzle",
    driver: "better-sqlite",
    dbCredentials: {
        url: env.DB_PATH
    }
} satisfies Config;