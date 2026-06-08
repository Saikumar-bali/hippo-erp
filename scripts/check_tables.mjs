#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const client = createClient(url, key);

async function main() {
  // Check app.companies
  const { data: companies, error: cErr } = await client
    .from("app.companies")
    .select("id")
    .limit(1);

  if (cErr) {
    console.log("app.companies:", cErr.message.substring(0, 100));
  } else {
    console.log("app.companies: EXISTS, rows:", companies?.length ?? 0);
  }

  // Check client_scripts
  const { data: scripts, error: sErr } = await client
    .from("app.erp_client_scripts")
    .select("id")
    .limit(1);

  if (sErr) {
    console.log("app.erp_client_scripts:", sErr.message.substring(0, 100));
  } else {
    console.log("app.erp_client_scripts: EXISTS, rows:", scripts?.length ?? 0);
  }

  // Check if erp_list_client_scripts function exists via information_schema
  const { data: funcs, error: fErr } = await client
    .from("information_schema.routines")
    .select("routine_name, specific_schema")
    .eq("routine_schema", "public")
    .eq("routine_name", "erp_list_client_scripts")
    .limit(1);

  if (fErr) {
    console.log("information_schema query:", fErr.message.substring(0, 100));
  } else {
    if (funcs && funcs.length > 0) {
      console.log("erp_list_client_scripts: EXISTS in information_schema");
    } else {
      console.log("erp_list_client_scripts: NOT FOUND in information_schema");
    }
  }

  // Also check specific RPCs
  const rpcs = [
    "erp_list_client_scripts",
    "erp_get_client_scripts_for_doctype",
    "erp_create_client_script",
    "erp_update_client_script",
    "erp_disable_client_script",
    "erp_delete_client_script",
    "validate_client_script_body",
  ];

  const { data: allFuncs } = await client
    .from("information_schema.routines")
    .select("routine_name")
    .eq("routine_schema", "public");

  if (allFuncs) {
    const existing = new Set(allFuncs.map((f) => f.routine_name));
    console.log("\nRPC Status:");
    for (const rpc of rpcs) {
      console.log(`  ${rpc}: ${existing.has(rpc) ? "EXISTS" : "NOT FOUND"}`);
    }
  }
}

main().catch(console.error);
