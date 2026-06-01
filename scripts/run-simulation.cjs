#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const files = [
  { path: path.join(process.cwd(), "tests", "simulations", "full_inventory_flow.sql"), label: "Full inventory flow" },
  { path: path.join(process.cwd(), "tests", "simulations", "company_profile_flow.sql"), label: "Company profile" },
  { path: path.join(process.cwd(), "tests", "simulations", "product_master_flow.sql"), label: "Product master data (Phase 2)" },
  { path: path.join(process.cwd(), "tests", "simulations", "metadata_engine_flow.sql"), label: "Metadata engine core (Phase 2.5)" },
  { path: path.join(process.cwd(), "tests", "simulations", "workspace_navigation_flow.sql"), label: "Workspace navigation (Phase 2.6)" },
  { path: path.join(process.cwd(), "tests", "simulations", "metadata_studio_foundation_flow.sql"), label: "Metadata Studio foundation (Phase 2.7)" },
  { path: path.join(process.cwd(), "tests", "simulations", "custom_doctype_storage_flow.sql"), label: "Custom DocType storage (Phase 2.8)" },
  { path: path.join(process.cwd(), "tests", "simulations", "custom_doctype_wizard_flow.sql"), label: "Custom DocType wizard flow (Phase 2.9)" },
  { path: path.join(process.cwd(), "tests", "simulations", "custom_doctype_wizard_hardening_flow.sql"), label: "Custom DocType wizard hardening (Phase 2.10)" },
  { path: path.join(process.cwd(), "tests", "simulations", "warehouse_hierarchy_flow.sql"), label: "Warehouse hierarchy (Phase 3)" },
  { path: path.join(process.cwd(), "tests", "simulations", "grn_inventory_receipt_flow.sql"), label: "GRN inventory receipt flow (Phase 4.1)" },
  { path: path.join(process.cwd(), "tests", "simulations", "grn_cancellation_reversal_flow.sql"), label: "GRN cancellation reversal flow (Phase 4.6)" },
];

let missing = false;
for (const f of files) {
  if (!fs.existsSync(f.path)) {
    console.error("Missing:", f.path, `(${f.label})`);
    missing = true;
  }
}
if (missing) process.exit(1);

console.log("All simulation SQL files are ready:\n");
for (const f of files) {
  console.log(`  ${f.label}: ${f.path}`);
}
console.log("\nSafe execution instructions:");
console.log("1) Open your Supabase SQL editor for a safe non-production branch/database.");
console.log("2) Select each simulation SQL file below and run it.");
console.log("3) Confirm all tests PASS with no exception messages.");
console.log("4) Each file rolls back so no test data persists.");
console.log("5) Fix any FAIL messages and re-run before declaring the phase complete.");

const arg = process.argv[2];
if (arg) {
  const match = files.find(f => f.label.toLowerCase().includes(arg.toLowerCase()));
  if (match) {
    console.log(`\nTo run "${match.label}", copy the file contents into Supabase SQL editor.`);
  } else {
    console.log(`\nNo simulation file matches "${arg}". Available: ${files.map(f => f.label).join(", ")}`);
  }
}
process.exit(0);
