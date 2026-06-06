import { readFileSync } from "fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = "https://api.supabase.com/v1/projects/bhqgszzvemejfbgndtnf/database/query";

async function q(sql) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ query: sql }) });
  return r.json();
}

const userId = "3c186455-5012-4c52-aef5-cbc9ab69700e";
const companyId = "11111111-1111-1111-1111-111111111111";

const r1 = await q(`SELECT * FROM app.company_user_permissions WHERE user_id = '${userId}'`);
console.log("Rules:", JSON.stringify(r1, null, 2));

const r2 = await q(`SELECT public.document_matches_user_permission_rules('${userId}'::uuid, '${companyId}'::uuid, 'crm_lead', '{}'::jsonb, 'read')`);
console.log("Match (empty data):", JSON.stringify(r2));

const r3 = await q(`SELECT public.document_matches_user_permission_rules('${userId}'::uuid, '${companyId}'::uuid, 'crm_lead', '{"owner_name": "new_user@example.com"}'::jsonb, 'read')`);
console.log("Match (matching owner):", JSON.stringify(r3));

const r4 = await q(`SELECT public.document_matches_user_permission_rules('${userId}'::uuid, '${companyId}'::uuid, 'crm_lead', '{"owner_name": "other@example.com"}'::jsonb, 'read')`);
console.log("Match (non-matching owner):", JSON.stringify(r4));

const r5 = await q(`SELECT public.document_matches_user_permission_rules('${userId}'::uuid, '${companyId}'::uuid, 'crm_lead', '{"owner_name": null}'::jsonb, 'read')`);
console.log("Match (null owner):", JSON.stringify(r5));
