import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import { env } from "../config/env.js";
import * as schema from "./schema.js";

const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  connectionLimit: 10
});

export const db = drizzle(pool, { schema, mode: "default" });
export { pool };
