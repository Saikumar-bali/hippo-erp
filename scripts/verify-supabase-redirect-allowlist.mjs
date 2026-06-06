import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) { console.error(`❌ Missing required env var: ${name}`); process.exit(1); }
  return val;
}

const url = requireEnv("VITE_SUPABASE_URL");
const key = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
const supabase = createClient(url, key);

const email = 'noreply+redirect-check@hippoerp.dev';
const redirects = [
  'https://hippo-erp.pages.dev/auth/callback',
  'https://hippo-erp.pages.dev/anything/deep',
  'https://preview-123.hippo-erp.pages.dev/some/path',
  'http://localhost:5173/auth/callback',
  'http://localhost:5173/any/path',
  'http://127.0.0.1:5173/any/path',
];

const results = [];
for (const redirectTo of redirects) {
  const res = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  results.push({
    redirectTo,
    accepted: !res.error,
    error: res.error?.message ?? null,
  });
}

console.log(JSON.stringify(results, null, 2));
