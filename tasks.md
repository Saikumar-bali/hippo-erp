# Phase 6.1 Tasks: Professional UX Foundation + Company Branding

Active branch: `phase-2.5-metadata-engine`

Goal: make Hippo ERP feel professional, simple, and easier to use than Frappe for daily users and developers. This phase focuses on UX consistency, company branding, and safe theme customization. Do not start Purchase Orders, Print Format Builder, Client Scripts, or arbitrary dynamic JavaScript yet.

## Current status

Phase 6.0 and 6.0.1 are now verified:

- Access Control Manager foundation exists
- Supabase Cloud RPC smoke tests passed
- authenticated browser verification passed with documented multi-role limitation
- full local tests are green
- User Role Assignment page is reachable

## Why this phase exists

A framework does not win only because it is flexible. It wins because it is easy and pleasant to use.

Current risk:

- too many technical screens
- too many raw internal names
- inconsistent density and spacing
- no company-specific branding
- no simple theme control
- no clear first-run UX
- developer/admin flows still feel heavier than they should

This phase should improve the experience before adding more business modules.

---

## A. Docs

- [x] Add GPT review: `docs/ai-runs/2026-06-03_gpt-review-phase-6-0-1-access-control-verification.md`
- [ ] Create `docs/PHASE_6_1_PROFESSIONAL_UX_BRANDING.md`
- [ ] Create `docs/ai-runs/2026-06-03_phase-6-1-professional-ux-branding.md`
- [ ] Update `progress.md`

---

## B. UX audit first

Before coding, audit current app screens:

- [ ] App shell/sidebar/topbar
- [ ] Metadata Studio home
- [ ] DocType Builder
- [ ] Field Builder
- [ ] List View Builder
- [ ] Form Layout Builder
- [ ] Access Control Manager
- [ ] CRM Dashboard
- [ ] CRM lists/forms
- [ ] GRN pages

Create a short UX audit section in the AI run report with:

- biggest friction points
- inconsistent spacing/density
- confusing labels
- places where raw technical details leak into normal flow
- recommended fixes completed in this phase

---

## C. Design tokens and density system

Create or improve global design tokens in CSS.

Required:

- [ ] compact enterprise spacing scale
- [ ] typography scale
- [ ] card/table/form density variables
- [ ] button/input heights
- [ ] sidebar width variables
- [ ] topbar height variable
- [ ] status badge styles
- [ ] empty-state pattern
- [ ] page-header pattern

Goal:

- screens should not feel zoomed at 150%
- tables should be compact but readable
- forms should be easier to scan
- builder screens should feel professional

---

## D. Company Branding / Theme Studio foundation

Create a company-scoped branding settings foundation.

Migration if needed:

- [ ] `supabase/migrations/0043_company_branding_theme.sql`

Support settings:

- [ ] company logo URL
- [ ] company favicon URL if practical
- [ ] primary color
- [ ] accent color
- [ ] sidebar color
- [ ] topbar color
- [ ] compact/comfortable density mode
- [ ] optional safe custom CSS variables only

Do not allow arbitrary JavaScript.

For custom CSS, only allow safe company-scoped CSS variables or a strict allowlist. Do not add unrestricted script execution.

---

## E. Theme Studio UI

Create:

- [ ] `src/components/theme/ThemeStudioPage.tsx`
- [ ] `src/lib/theme-api.ts`
- [ ] `src/lib/theme-types.ts`

Required UX:

- [ ] select company
- [ ] upload/paste logo URL
- [ ] choose primary color
- [ ] choose accent color
- [ ] choose sidebar/topbar colors
- [ ] choose density: Compact / Comfortable
- [ ] preview theme live
- [ ] save theme settings
- [ ] reset to default
- [ ] show warning that JavaScript is not allowed

---

## F. Apply company theme safely

Update app shell/theme provider:

- [ ] load selected company branding settings
- [ ] apply CSS variables to app root
- [ ] apply logo in sidebar/header if configured
- [ ] apply density class
- [ ] fallback safely if branding missing
- [ ] do not break login/auth pages

---

## G. Metadata Studio and Access Control UX cleanup

Improve professional usability:

- [ ] clearer section titles
- [ ] fewer raw keys in primary labels
- [ ] helper text uses business language first, technical detail second
- [ ] next-step actions are visually obvious
- [ ] Access Control Manager explains effective rights and multi-role aggregation simply
- [ ] Check / Repair explains when to use it

---

## H. CRM and GRN UI polish pass

Small but visible polish only:

- [ ] CRM Dashboard spacing/cards consistent with design tokens
- [ ] CRM list empty states improved
- [ ] GRN pages use consistent page header/card/table styles
- [ ] buttons and badges consistent

Do not add new CRM features.
Do not add new inventory features.

---

## I. Browser verification

Verify in browser:

- [ ] Theme Studio opens
- [ ] changing primary/accent/sidebar colors updates preview
- [ ] saving theme persists
- [ ] app shell uses saved branding
- [ ] density Compact makes screens visibly tighter
- [ ] reset to default works
- [ ] Metadata Studio still works
- [ ] Access Control Manager still works
- [ ] CRM Dashboard still works
- [ ] no permission errors for owner/admin

Screenshots:

- [ ] commit screenshots if practical under `docs/ai-runs/screenshots/phase-6-1-ux-branding/`
- [ ] if local-only, document exact local paths

---

## J. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

## K. Acceptance

Phase 6.1 is complete only when:

- [ ] UX audit is documented
- [ ] global design tokens/density are improved
- [ ] Theme Studio foundation exists
- [ ] company branding settings save and load
- [ ] app shell applies company theme safely
- [ ] compact/comfortable density works
- [ ] Metadata Studio, Access Control, CRM, and GRN still work
- [ ] browser verification is documented
- [ ] AI run report exists

After Phase 6.1, recommended next phase:

- Phase 6.2: Export / Import Foundation
