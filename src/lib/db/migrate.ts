import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
const path = url.startsWith("file:") ? url.slice("file:".length) : url;

const dir = dirname(path);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(path);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();
console.log("migrations applied →", path);
