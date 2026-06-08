#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(url, key);

async function main() {
  // Try app.current_company_id
  const { data, error } = await client.rpc("current_company_id");
  if (error) {
    console.log("current_company_id error:", error.message?.substring(0, 150));
  } else {
    console.log("current_company_id result:", data);
  }

  // Try calling as app.current_company_id
  const { data: d2, error: e2 } = await client.rpc("app.current_company_id");
  if (e2) {
    console.log("app.current_company_id error:", e2.message?.substring(0, 150));
  } else {
    console.log("app.current_company_id result:", d2);
  }
}

main();
