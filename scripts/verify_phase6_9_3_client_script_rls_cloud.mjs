#!/usr/bin/env node
/**
 * Phase 6.9.3 — Client Script Direct RLS Verification (Correct Schema)
 *
 * Uses authenticated Supabase sessions and the CORRECT schema access:
 *   `.schema("app").from("erp_client_scripts")`
 * instead of the incorrect:
 *   `.from("app.erp_client_scripts")` — which PostgREST interprets as public.app.erp_client_scripts
 *
 * Verifies:
 * 1. Restricted direct INSERT is blocked
 * 2. Restricted direct UPDATE is blocked
 * 3. Restricted direct DELETE is blocked
 * 4. Restricted direct SELECT does not expose scripts for unauthorized DocTypes
 * 5. Admin direct SELECT works (control)
 *
 * Exit code: 0 if all pass, 1 if any fail.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || requireEnv("SUPABASE_URL");
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
const ADMIN_EMAIL = requireEnv("PLAYWRIGHT_TEST_EMAIL");
const ADMIN_PASSWORD = requireEnv("PLAYWRIGHT_TEST_PASSWORD");
const RESTRICTED_EMAIL = requireEnv("PLAYWRIGHT_LOW_PRIV_EMAIL");
const RESTRICTED_PASSWORD = requireEnv("PLAYWRIGHT_LOW_PRIV_PASSWORD");

const OUTPUT_DIR = "C:/tmp/phase-6-9-3-client-script-rls";

let passCount = 0;
let failCount = 0;
const results = [];

function pass(name) { passCount++; results.push({ status: "PASS", name }); console.log(`  \u2713 ${name}`); }
function fail(name, reason) { failCount++; results.push({ status: "FAIL", name, reason }); console.log(`  \u2717 ${name} \u2014 ${reason}`); }

async function signInAs(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login failed for ${email}: ${error?.message || "no session"}`);
  }
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  return { client: authed, session: data.session };
}

async function run() {
  console.log("\n=== Phase 6.9.3: Client Script Direct RLS Cloud Verification ===\n");
  console.log("Using CORRECT schema access: .schema(\"app\").from(\"erp_client_scripts\")\n");

  let admin, restricted;

  try {
    const a = await signInAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    admin = a.client;
    pass("Admin login successful");
  } catch (e) {
    fail("Admin login", e.message);
    process.exit(1);
  }

  try {
    const r = await signInAs(RESTRICTED_EMAIL, RESTRICTED_PASSWORD);
    restricted = r.client;
    pass("Restricted user login successful");
  } catch (e) {
    fail("Restricted user login", e.message);
  }

  // ── 1. Restricted INSERT blocked ────────────────────────────────────
  console.log("\n--- Direct INSERT Blocked (Restricted) ---");
  if (restricted) {
    const { error: insErr } = await restricted
      .schema("app")
      .from("erp_client_scripts")
      .insert({ doctype_key: "crm_lead", script_name: "rls_insert_test_" + Date.now(), script_body: { rules: [] }, event_name: "onLoad" })
      .maybeSingle();
    if (insErr) {
      pass("Restricted INSERT blocked (correct .schema('app').from())", (insErr.message || "").substring(0, 80));
    } else {
      fail("Restricted INSERT blocked", "Insert succeeded — RLS policy may be missing");
    }

    // ── 2. Restricted UPDATE blocked ──────────────────────────────────
    const { data: updData, error: updErr } = await restricted
      .schema("app")
      .from("erp_client_scripts")
      .update({ script_name: "hacked_name_" + Date.now() })
      .eq("doctype_key", "crm_lead")
      .select()
      .maybeSingle();
    if (updErr) {
      pass("Restricted UPDATE blocked (correct .schema('app').from())", (updErr.message || "").substring(0, 80));
    } else if (updData === null) {
      // RLS filtered all rows — zero affected. This is correct behavior.
      pass("Restricted UPDATE blocked (RLS filtered all rows, zero affected)");
    } else {
      fail("Restricted UPDATE blocked", `Update succeeded — affected row: ${JSON.stringify(updData).substring(0, 80)}`);
    }

    // ── 3. Restricted DELETE blocked ──────────────────────────────────
    const { data: delData, error: delErr } = await restricted
      .schema("app")
      .from("erp_client_scripts")
      .delete()
      .eq("doctype_key", "crm_lead")
      .select()
      .maybeSingle();
    if (delErr) {
      pass("Restricted DELETE blocked (correct .schema('app').from())", (delErr.message || "").substring(0, 80));
    } else if (delData === null) {
      // RLS filtered all rows — zero affected. This is correct behavior.
      pass("Restricted DELETE blocked (RLS filtered all rows, zero affected)");
    } else {
      fail("Restricted DELETE blocked", `Delete succeeded — affected row: ${JSON.stringify(delData).substring(0, 80)}`);
    }

    // ── 4. Restricted SELECT limited to authorized DocTypes ───────────
    const { data: selData, error: selErr } = await restricted
      .schema("app")
      .from("erp_client_scripts")
      .select("doctype_key, script_name, is_enabled")
      .limit(50);
    if (selErr) {
      pass("Restricted SELECT access", selErr.message.substring(0, 80));
      // SELECT is blocked entirely — still a valid security outcome
    } else {
      // SELECT succeeded — check which doctypes are visible
      if (Array.isArray(selData) && selData.length > 0) {
        const doctypes = [...new Set(selData.map(r => r.doctype_key))];
        const hasCrmLead = doctypes.includes("crm_lead");
        const hasUnauthorized = doctypes.some(d => !["crm_lead"].includes(d));
        if (hasCrmLead && !hasUnauthorized) {
          pass("Restricted SELECT only returns CRM Lead scripts (authorized doctype)");
        } else if (!hasCrmLead) {
          fail("Restricted SELECT", "CRM Lead scripts not visible — RLS too restrictive");
        } else {
          fail("Restricted SELECT", `Unauthorized DocTypes visible: ${doctypes.filter(d => d !== "crm_lead").join(", ")}`);
        }
      } else {
        pass("Restricted SELECT returned no rows (scripts may be in another company)");
      }
    }
  }

  // ── 5. Admin SELECT works (control) ────────────────────────────────
  console.log("\n--- Admin Control SELECT ---");
  if (admin) {
    const { data: selData, error: selErr } = await admin
      .schema("app")
      .from("erp_client_scripts")
      .select("doctype_key, script_name, is_enabled")
      .limit(50);
    if (selErr) {
      fail("Admin SELECT works (control)", selErr.message.substring(0, 80));
    } else if (Array.isArray(selData) && selData.length > 0) {
      pass("Admin SELECT returns client scripts (control)");
      const demo = selData.find(s => s.doctype_key === "crm_lead" && s.script_name === "CRM Lead Qualification Rules");
      if (demo) {
        pass("Admin SELECT shows CRM Lead demo script");
      } else {
        fail("Admin SELECT shows CRM Lead demo script", "Demo script not found in direct table select");
      }
    } else {
      fail("Admin SELECT returns client scripts (control)", "No rows returned");
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    phase: "6.9.3",
    type: "cloud-rls",
    schema_method: ".schema('app').from('erp_client_scripts')",
    timestamp: new Date().toISOString(),
    results,
    summary: { pass: passCount, fail: failCount, total: passCount + failCount },
  };
  writeFileSync(`${OUTPUT_DIR}/cloud-rls-results.json`, JSON.stringify(output, null, 2));

  console.log(`\n${"\u2500".repeat(50)}`);
  console.log(`Results: ${passCount} PASS, ${failCount} FAIL, ${passCount + failCount} TOTAL`);
  if (failCount > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  \u2717 ${r.name}${r.reason ? `: ${r.reason}` : ""}`);
    }
  }
  console.log(`Results JSON: ${OUTPUT_DIR}/cloud-rls-results.json\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

run();
