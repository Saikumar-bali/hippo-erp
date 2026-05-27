#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const sqlPath = path.join(process.cwd(), "tests", "simulations", "full_inventory_flow.sql");
const sqlExists = fs.existsSync(sqlPath);

if (!sqlExists) {
  console.error("Missing tests/simulations/full_inventory_flow.sql");
  process.exit(1);
}

console.log("Simulation SQL is ready:", sqlPath);
console.log("\nSafe cloud execution instructions:");
console.log("1) Open Supabase SQL editor for project bhqgszzvemejfbgndtnf.");
console.log("2) Run tests/simulations/full_inventory_flow.sql in a non-production branch/database.");
console.log("3) Confirm no errors except expected negative checks.");
console.log("4) Verify rollback keeps database clean.");
process.exit(0);
