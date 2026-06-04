import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.schema("app").from("permissions").select("*").eq("permission_key", "print_crm_lead").maybeSingle();
  console.log("Permission print_crm_lead:", data, error);
}

check();
