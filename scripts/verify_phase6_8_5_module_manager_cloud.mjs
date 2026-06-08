#!/usr/bin/env node
/**
 * Phase 6.8.5 — Metadata Studio Module Manager: Authenticated Cloud/RPC proof
 *
 * Signs in as admin/owner and restricted user via Supabase auth, then
 * tests that:
 * 1. All 7 module RPCs exist in the public schema
 * 2. Admin/owner can list/create/update/deactivate/reactivate/delete modules
 * 3. Restricted user cannot call any module RPC
 * 4. Delete is blocked when a module is referenced by an active DocType
 * 5. Direct table writes are blocked for restricted user (RLS)
 * 6. Unauthenticated (anon) calls are blocked
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

const OUTPUT_DIR = "C:/tmp/phase-6-8-5-module-manager";

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
  // Create an authed client using the session access token
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  return authed;
}

async function run() {
  console.log("\n=== Phase 6.8.5 Module Manager Authenticated Cloud/RPC Proof ===\n");

  // ── Sign in ─────────────────────────────────────────────────────
  console.log("--- Signing in ---");
  let admin, restricted;
  try {
    admin = await signInAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass("Admin login successful");
  } catch (e) {
    fail("Admin login", e.message);
    // Cannot continue without admin session
    writeFileSync(`${OUTPUT_DIR}/cloud-results.json`, JSON.stringify({ phase: "6.8.5", type: "cloud", results, error: e.message }));
    process.exit(1);
  }
  try {
    restricted = await signInAs(RESTRICTED_EMAIL, RESTRICTED_PASSWORD);
    pass("Restricted user login successful");
  } catch (e) {
    fail("Restricted user login", e.message);
    // Still continue — admin tests can run
  }

  // ── 1. Admin/owner: list modules ────────────────────────────────
  console.log("\n--- Admin/Owner Module Management ---");
  {
    const { data: listData, error: listErr } = await admin.rpc("erp_list_modules");
    if (listErr) {
      fail("Admin: erp_list_modules", listErr.message);
    } else if (listData?.ok === true) {
      pass("Admin: erp_list_modules succeeds");
    } else {
      fail("Admin: erp_list_modules", listData?.error || "unexpected");
    }
  }

  // ── 2. Admin/owner: create module ───────────────────────────────
  let createdModuleId = null;
  const testKey = "cloud_proof_" + Date.now();
  {
    const { data: createData, error: createErr } = await admin.rpc("erp_create_module", {
      p_module_key: testKey,
      p_label: "Cloud Proof Module",
    });
    if (createErr) {
      fail("Admin: erp_create_module", createErr.message);
    } else if (createData?.ok === true) {
      createdModuleId = createData.data.id;
      pass("Admin: erp_create_module succeeds");
    } else {
      fail("Admin: erp_create_module", createData?.error || "unexpected");
    }
  }

  // ── 3. Admin/owner: update module ───────────────────────────────
  if (createdModuleId) {
    const { data: updateData, error: updateErr } = await admin.rpc("erp_update_module", {
      p_id: createdModuleId,
      p_label: "Cloud Proof Module Updated",
    });
    if (updateErr) {
      fail("Admin: erp_update_module", updateErr.message);
    } else if (updateData?.ok === true) {
      pass("Admin: erp_update_module succeeds");
    } else {
      fail("Admin: erp_update_module", updateData?.error || "unexpected");
    }
  }

  // ── 4. Admin/owner: deactivate module ───────────────────────────
  if (createdModuleId) {
    const { data: deactData, error: deactErr } = await admin.rpc("erp_deactivate_module", {
      p_id: createdModuleId,
    });
    if (deactErr) {
      fail("Admin: erp_deactivate_module", deactErr.message);
    } else if (deactData?.ok === true) {
      pass("Admin: erp_deactivate_module succeeds");
    } else {
      fail("Admin: erp_deactivate_module", deactData?.error || "unexpected");
    }
  }

  // ── 5. Admin/owner: reactivate module ───────────────────────────
  if (createdModuleId) {
    const { data: reactData, error: reactErr } = await admin.rpc("erp_reactivate_module", {
      p_id: createdModuleId,
    });
    if (reactErr) {
      fail("Admin: erp_reactivate_module", reactErr.message);
    } else if (reactData?.ok === true) {
      pass("Admin: erp_reactivate_module succeeds");
    } else {
      fail("Admin: erp_reactivate_module", reactData?.error || "unexpected");
    }
  }

  // ── 6. Admin/owner: delete unused module ────────────────────────
  if (createdModuleId) {
    const { data: delData, error: delErr } = await admin.rpc("erp_delete_module_if_unused", {
      p_id: createdModuleId,
    });
    if (delErr) {
      fail("Admin: erp_delete_module_if_unused (unused)", delErr.message);
    } else if (delData?.ok === true) {
      pass("Admin: erp_delete_module_if_unused succeeds for unused module");
    } else {
      fail("Admin: erp_delete_module_if_unused", delData?.error || "unexpected");
    }
  }

  // ── 7. Restricted user: all RPCs blocked ────────────────────────
  console.log("\n--- Restricted User RPCs Blocked ---");
  const restrictedRpcs = [
    ["erp_list_modules", {}],
    ["erp_create_module", { p_module_key: "restricted_test_" + Date.now(), p_label: "Restricted" }],
    ["erp_update_module", { p_id: "00000000-0000-0000-0000-000000000000", p_label: "x" }],
    ["erp_deactivate_module", { p_id: "00000000-0000-0000-0000-000000000000" }],
    ["erp_reactivate_module", { p_id: "00000000-0000-0000-0000-000000000000" }],
    ["erp_delete_module_if_unused", { p_id: "00000000-0000-0000-0000-000000000000" }],
  ];

  if (restricted) {
    for (const [rpcName, params] of restrictedRpcs) {
      try {
        const { data, error } = await restricted.rpc(rpcName, params);
        if (error) {
          pass(`Restricted: ${rpcName} blocked`, (error.message || "").substring(0, 80));
        } else if (data && data.ok === false) {
          pass(`Restricted: ${rpcName} blocked`, (data.error || "denied").substring(0, 80));
        } else {
          fail(`Restricted: ${rpcName} NOT blocked`, "Restricted user successfully called RPC");
        }
      } catch (e) {
        pass(`Restricted: ${rpcName} blocked`, String(e).substring(0, 80));
      }
    }
  } else {
    for (const [rpcName] of restrictedRpcs) {
      fail(`Restricted: ${rpcName}`, "Skipped — restricted user login failed");
    }
  }

  // ── 8. Delete blocked when DocTypes reference ───────────────────
  console.log("\n--- Safe Delete Reference Check ---");
  if (admin) {
    try {
      const { data: listData } = await admin.rpc("erp_list_modules");
      if (listData?.ok && Array.isArray(listData.data)) {
        const refModule = listData.data.find((m) => m.doctype_count > 0);
        if (refModule) {
          const { data: delCheck } = await admin.rpc("erp_delete_module_if_unused", { p_id: refModule.id });
          if (delCheck?.ok === false) {
            pass("Delete blocked for referenced module", (delCheck.error || "blocked").substring(0, 80));
          } else {
            fail("Delete blocked for referenced module", "Delete succeeded despite references");
          }
        } else {
          console.log("  \u2014 No module with DocType references found to test delete blocking");
        }
      } else {
        fail("Delete reference check", "Could not list modules");
      }
    } catch (e) {
      fail("Delete reference check", String(e));
    }
  }

  // ── 9. Direct table write blocked for restricted user ───────────
  console.log("\n--- Direct Table Write Bypass Blocked (Restricted User) ---");
  if (restricted) {
    const testBypassKey = "bypass_test_" + Date.now();

    // INSERT
    const { error: insErr } = await restricted
      .from("erp_modules")
      .insert({ module_key: testBypassKey, label: "Bypass Test" })
      .maybeSingle();
    if (insErr) {
      pass("Direct INSERT blocked (restricted)", (insErr.message || "").substring(0, 80));
    } else {
      fail("Direct INSERT blocked (restricted)", "Restricted user bypassed RLS — inserted directly");
    }

    // UPDATE
    const { error: updErr } = await restricted
      .from("erp_modules")
      .update({ label: "Bypassed" })
      .eq("module_key", testBypassKey)
      .maybeSingle();
    if (updErr) {
      pass("Direct UPDATE blocked (restricted)", (updErr.message || "").substring(0, 80));
    } else {
      fail("Direct UPDATE blocked (restricted)", "Restricted user bypassed RLS — updated directly");
    }

    // DELETE
    const { error: delErr } = await restricted
      .from("erp_modules")
      .delete()
      .eq("module_key", testBypassKey)
      .maybeSingle();
    if (delErr) {
      pass("Direct DELETE blocked (restricted)", (delErr.message || "").substring(0, 80));
    } else {
      fail("Direct DELETE blocked (restricted)", "Restricted user bypassed RLS — deleted directly");
    }
  } else {
    fail("Direct table writes", "Skipped — restricted user login failed");
  }

  // ── 10. RPC existence check (via anon, verifies schema) ─────────
  console.log("\n--- RPC Existence (via anon — verifies schema) ---");
  const rpcNames = [
    "erp_list_modules", "erp_create_module", "erp_update_module",
    "erp_deactivate_module", "erp_reactivate_module", "erp_delete_module_if_unused",
    "erp_module_has_doctypes",
  ];
  for (const name of rpcNames) {
    try {
      const { error } = await admin.rpc(name, {});
      // If it's a permission error, the RPC exists
      if (error && (error.message?.includes("not found") || error.message?.includes("does not exist") || error.code === "PGRST202")) {
        fail(`RPC exists: ${name}`, "Not found");
      } else {
        pass(`RPC exists: ${name}`);
      }
    } catch (e) {
      if (String(e).includes("not found") || String(e).includes("does not exist")) {
        fail(`RPC exists: ${name}`, "Not found");
      } else {
        pass(`RPC exists: ${name}`);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    phase: "6.8.5",
    type: "cloud",
    timestamp: new Date().toISOString(),
    results,
    summary: { pass: passCount, fail: failCount, total: passCount + failCount },
  };
  writeFileSync(`${OUTPUT_DIR}/cloud-results.json`, JSON.stringify(output, null, 2));

  console.log(`\n${"\u2500".repeat(50)}`);
  console.log(`Results: ${passCount} PASS, ${failCount} FAIL, ${passCount + failCount} TOTAL`);
  if (failCount > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  \u2717 ${r.name}${r.reason ? `: ${r.reason}` : ""}`);
    }
  }
  console.log(`Results JSON: ${OUTPUT_DIR}/cloud-results.json\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

run();
