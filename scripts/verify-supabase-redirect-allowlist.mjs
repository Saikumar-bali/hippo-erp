import { createClient } from '@supabase/supabase-js';

const url = 'https://bhqgszzvemejfbgndtnf.supabase.co';
const key = 'sb_publishable_Wl_xCBhyjpzUlJsdTtSxNA_tS9uR6kU';
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
