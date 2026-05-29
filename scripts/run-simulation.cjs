#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const files = [
  { path: path.join(process.cwd(), "tests", "simulations", "full_inventory_flow.sql"),       label: "Full inventory flow" },
  { path: path.join(process.cwd(), "tests", "simulations", "company_profile_flow.sql"),       label: "Company profile" },
  { path: path.join(process.cwd(), "tests", "simulations", "product_master_flow.sql"),         label: "Product master data (Phase 2)" },
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
console.log("\nSafe cloud execution instructions:");
console.log("1) Open Supabase SQL editor for project bhqgszzvemejfbgndtnf.");
console.log("2) Select each simulation SQL file below and run it in a non-production branch/database.");
console.log("3) Confirm all tests PASS (no exception messages).");
console.log("4) Each file rolls back so no test data persists.");
console.log("5) Fix any FAIL messages and re-run before declaring the phase complete.");

// Optionally allow selective run via argument: node scripts/run-simulation.cjs product
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
