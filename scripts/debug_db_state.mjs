import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data: tenants, error: tErr } = await supabase.schema("app").from("tenants").select("*");
  console.log("Tenants:", tenants, tErr);

  const { data: users, error: uErr } = await supabase.schema("app").from("tenant_members").select("*");
  console.log("Memberships:", users, uErr);
}

check();
