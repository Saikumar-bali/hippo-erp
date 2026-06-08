#!/usr/bin/env node
/**
 * Apply migrations to Supabase Cloud by executing SQL directly.
 * Connects using the PG connection string from the linked project.
 */
import https from "https";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

async function main() {
  // Strategy 1: Try direct PG connection (requires pg module + password)
  if (DB_PASSWORD) {
    try {
      const { default: pg } = await import("pg");
      const client = new pg.Client({
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      console.log("Connected via pg");
      
      // Apply SQL files
      for (const file of process.argv.slice(2)) {
        const sql = fs.readFileSync(file, "utf8");
        console.log(`Applying ${file}...`);
        await client.query(sql);
        console.log(`  Done`);
      }
      await client.end();
      return;
    } catch (e) {
      console.log("pg connection failed:", e.message);
    }
  }

  // Strategy 2: Create app.companies via Supabase REST API with service role
  // Use the auth.signInWithPassword approach - authenticate as admin, then execute
  console.log("Attempting to call RPC to create app.companies...");
  
  // We can use an existing RPC to check if things work, but we can't run DDL via REST.
  // The only way is through direct PG connection or Management API.
  
  console.error("Cannot execute DDL without DB password or valid Management API token.");
  console.error("Please apply migrations manually via the Supabase Dashboard SQL Editor:");
  console.error(`  Project: ${PROJECT_REF}`);
  console.error("  1. First create app.companies table (see 0056_01_create_app_companies.sql)");
  console.error("  2. Then apply 0056_client_script_sandbox_foundation.sql");
  console.error("  3. Then apply 0057_client_script_security_hardening.sql");
  console.error("  4. Then apply 0058_client_script_rpc_contract_fix.sql");
}

main().catch(console.error);
