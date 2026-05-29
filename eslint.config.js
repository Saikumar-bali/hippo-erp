import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "supabase/**", "scripts/**/*.cjs", "scripts/**/*.mjs"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "vite.config.ts"],
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
);
