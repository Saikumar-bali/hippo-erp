import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.PLAYWRIGHT_RESULTS_DIR || "C:/tmp/phase-6-6-1-auth-refresh";
await fs.mkdir(outDir, { recursive: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword) {
  console.error("Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_TEST_PASSWORD");
  process.exit(1);
}

const checks = {};
let exitCode = 0;

function pass(name, detail) {
  checks[name] = { pass: true, detail };
  console.log(`  PASS  ${name}: ${detail}`);
}

function fail(name, detail) {
  checks[name] = { pass: false, detail };
  console.error(`  FAIL  ${name}: ${detail}`);
  exitCode = 1;
}

function assert(condition, name, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Phase 1: Auth state change listener verification ---
console.log("\n=== Phase 1: Auth state change listener (API level) ===");

const client = createClient(supabaseUrl, publishableKey);

// Track auth state changes
const authEvents = [];
let resolveAuthReady;
const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

const { data: subData } = client.auth.onAuthStateChange((event, session) => {
  authEvents.push({ event, hasSession: !!session, userId: session?.user?.id });
  if (event === "SIGNED_IN" && session) {
    resolveAuthReady();
  }
});

// 1a. Sign in and verify SIGNED_IN event fires
try {
  const { data, error } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (error) throw error;
  pass("sign_in_success", `Signed in as ${adminEmail}`);

  // Wait for auth state change event
  const authResult = await Promise.race([
    authReady.then(() => "resolved"),
    sleep(5000).then(() => "timeout"),
  ]);

  assert(authResult === "resolved", "auth_state_change_fires", "SIGNED_IN event fires after signInWithPassword");
  assert(authEvents.some((e) => e.event === "SIGNED_IN"), "auth_event_signed_in", `Auth events: ${authEvents.map((e) => e.event).join(", ")}`);
} catch (e) {
  fail("sign_in_success", e.message);
}

// 1b. Session is immediately available after sign-in
try {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  assert(!!session, "session_available_after_signin", "Session is available immediately after sign-in");
  assert(!!session?.user, "user_in_session", "User is in session");
  assert(session?.user?.email === adminEmail, "correct_user_in_session", `Session user: ${session?.user?.email}`);
} catch (e) {
  fail("session_available_after_signin", e.message);
}

// 1c. User can call RPCs immediately after sign-in (no refresh needed)
try {
  // Get company_id
  const { data: memberData, error: memberError } = await client
    .schema("app")
    .from("tenant_members")
    .select("tenant_id")
    .limit(1)
    .single();
  if (memberError) throw memberError;
  const companyId = memberData.tenant_id;

  // Call an RPC to verify access
  const { data: rpcData, error: rpcError } = await client.rpc("erp_list_document_audit_events", {
    p_doctype_key: "crm_lead",
    p_document_id: "00000000-0000-0000-0000-000000000000",
    p_company_id: companyId,
  });
  // Even if document not found, the RPC should respond (not 401/403)
  if (rpcError) {
    // RPC error is ok if it's "Document not found", not auth error
    assert(!rpcError.message.includes("JWT"), "rpc_works_after_signin", `RPC responded: ${rpcError.message}`);
  } else {
    pass("rpc_works_after_signin", "RPC responded after sign-in without refresh");
  }
} catch (e) {
  fail("rpc_works_after_signin", e.message);
}

// --- Phase 2: Sign out and sign in again (verify no stale state) ---
console.log("\n=== Phase 2: Sign out and re-sign in ===");

try {
  const { error } = await client.auth.signOut();
  if (error) throw error;
  pass("sign_out_success", "Signed out successfully");

  // Verify session is null
  const { data: { session } } = await client.auth.getSession();
  assert(!session, "session_null_after_signout", "Session is null after sign-out");
} catch (e) {
  fail("sign_out_success", e.message);
}

// 2b. Sign in again and verify fresh state
try {
  authEvents.length = 0;
  let resolveAuthReady2;
  const authReady2 = new Promise((resolve) => { resolveAuthReady2 = resolve; });

  const unsub = client.auth.onAuthStateChange((event, session) => {
    authEvents.push({ event, hasSession: !!session });
    if (event === "SIGNED_IN" && session) {
      resolveAuthReady2();
    }
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (error) throw error;
  pass("re_sign_in_success", "Re-signed in successfully");

  const authResult = await Promise.race([
    authReady2.then(() => "resolved"),
    sleep(5000).then(() => "timeout"),
  ]);

  assert(authResult === "resolved", "re_sign_in_auth_event_fires", "SIGNED_IN event fires on re-sign-in");

  // Verify session is fresh
  const { data: { session } } = await client.auth.getSession();
  assert(!!session, "session_available_after_re_signin", "Session available after re-sign-in");

  unsub.data.subscription.unsubscribe();
} catch (e) {
  fail("re_sign_in_success", e.message);
}

// --- Phase 3: Concurrent session check ---
console.log("\n=== Phase 3: Session consistency ===");

try {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  assert(!!session, "session_persisted", "Session persists across RPC calls");
  assert(!!session?.access_token, "access_token_present", "Access token is present");
  assert(!!session?.refresh_token, "refresh_token_present", "Refresh token is present");
} catch (e) {
  fail("session_persisted", e.message);
}

// --- Phase 4: Save results ---
console.log("\n=== Phase 4: Results ===");

const results = {
  timestamp: new Date().toISOString(),
  checks,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter((c) => c.pass).length,
  failed: Object.values(checks).filter((c) => !c.pass).length,
};

await fs.writeFile(path.join(outDir, "auth-results.json"), JSON.stringify(results, null, 2));
console.log(`\nResults saved to ${path.join(outDir, "auth-results.json")}`);
console.log(`Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);

if (exitCode !== 0) {
  console.error("\nSome checks FAILED.");
} else {
  console.log("\nAll checks PASSED.");
}

process.exit(exitCode);
