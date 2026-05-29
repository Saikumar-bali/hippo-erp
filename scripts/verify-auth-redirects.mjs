import { createClient } from '@supabase/supabase-js';

const url = 'https://bhqgszzvemejfbgndtnf.supabase.co';
const key = 'sb_publishable_Wl_xCBhyjpzUlJsdTtSxNA_tS9uR6kU';
const supabase = createClient(url, key);

const id = Date.now();
const emailProd = `codex.prod.${id}@example.com`;
const emailLocal = `codex.local.${id}@example.com`;
const pwd = `Codex#${id}Aa`;

const prod = await supabase.auth.signUp({
  email: emailProd,
  password: pwd,
  options: { emailRedirectTo: 'https://hippo-erp.pages.dev/auth/callback' },
});

const local = await supabase.auth.signUp({
  email: emailLocal,
  password: pwd,
  options: { emailRedirectTo: 'http://localhost:5173/auth/callback' },
});

const resetProd = await supabase.auth.resetPasswordForEmail(emailProd, {
  redirectTo: 'https://hippo-erp.pages.dev/auth/callback',
});

const resetLocal = await supabase.auth.resetPasswordForEmail(emailLocal, {
  redirectTo: 'http://localhost:5173/auth/callback',
});

console.log(
  JSON.stringify(
    {
      signupProdError: prod.error?.message ?? null,
      signupLocalError: local.error?.message ?? null,
      resetProdError: resetProd.error?.message ?? null,
      resetLocalError: resetLocal.error?.message ?? null,
      signupProdUser: Boolean(prod.data.user),
      signupLocalUser: Boolean(local.data.user),
    },
    null,
    2
  )
);
