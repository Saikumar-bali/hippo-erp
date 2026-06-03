# Phase 6.1 — Professional UX Foundation + Company Branding

## Goal

Make Hippo ERP feel professional, simple, compact, and easier to use than Frappe before adding more transaction workflows.

This phase deliberately avoids Purchase Orders, Print Format Builder, Client Scripts, arbitrary dynamic JavaScript, and new ERP transaction logic.

## UX audit summary

### Biggest friction points

- The shell had density overrides, but spacing tokens were fragmented and not company-theme aware.
- Metadata Studio still led with raw technical labels in several places, making builder flows feel more like database maintenance than guided setup.
- Access Control explained role matrices but did not clearly say that effective user rights are aggregated across active roles.
- CRM Dashboard used large inline spacing that made the page feel zoomed in compared with compact enterprise screens.
- GRN list had a useful table, but lacked a consistent page header pattern and reused local badge styles.

### Inconsistent density and spacing

- Cards, tables, forms, and page headers were not all driven by the same variables.
- CRM cards used 24px local padding/gaps while Metadata Studio and GRN used smaller values.
- Sidebar and topbar dimensions were defined but not exposed as a company-density system.

### Raw technical details leaking

- Metadata advanced tables exposed `app.erp_*` labels in primary descriptions.
- Access Control showed permission keys as chips without first explaining business rights and multi-role aggregation.
- Check / Repair was present, but its recommended use was not obvious from the first screen.

## Completed fixes

- Added a Phase 6.1 token layer for compact enterprise spacing, typography, card/table/form density, control heights, sidebar width, topbar height, status badges, empty states, and page headers.
- Added company-scoped Theme Studio with safe color, logo, favicon, and density settings.
- Added secure theme RPCs that allow only known fields, #RRGGBB colors, http(s) logo/favicon URLs, and allowlisted CSS variables.
- Applied selected company branding to the app shell with safe fallbacks and without touching auth/login pages.
- Added logo rendering in sidebar and topbar.
- Polished Metadata Studio copy to put business language first and technical inspection second.
- Polished Access Control copy to explain effective rights and multi-role aggregation.
- Standardized CRM Dashboard spacing around shared tokens.
- Standardized GRN page header and status badge patterns.

## Theme migration details

Migration: `supabase/migrations/0043_company_branding_theme.sql`

Adds to `app.tenants`:

- `favicon_url`
- `theme_primary_color`
- `theme_accent_color`
- `theme_sidebar_color`
- `theme_topbar_color`
- `theme_density_mode`
- `theme_custom_variables`

Adds RPCs:

- `safe_company_theme_variables(jsonb)`
- `get_company_theme(uuid)`
- `save_company_theme(jsonb)`
- `reset_company_theme(uuid)`

Security guardrails:

- Owner/admin required to save or reset branding.
- Colors must be `#RRGGBB`.
- Logo and favicon URLs must be `http://` or `https://`.
- Density must be `compact` or `comfortable`.
- Custom variables are filtered to a strict allowlist.
- No JavaScript storage or execution path was added.
- No unrestricted CSS text is stored or applied.

## Theme Studio UX

Theme Studio supports:

- Company selection.
- Logo URL.
- Favicon URL.
- Primary/accent/sidebar/topbar colors.
- Compact or Comfortable density.
- Live preview.
- Save.
- Reset default.
- Clear warning that JavaScript is not allowed.

## Browser verification notes

Automated browser verification could not be completed in this container because no Supabase remote is configured in `git remote -v`, and browser-authenticated owner/admin data is not available locally. The implemented routes and UI are available at `/theme_studio` after the migration is applied and the user has `update_company` access.

Expected manual checks:

1. Open `/theme_studio` as a company owner/admin.
2. Change primary, accent, sidebar, and topbar colors and confirm the preview changes immediately.
3. Save and confirm the app shell uses the saved colors/logo.
4. Switch density to Compact and confirm tables/cards/forms become tighter.
5. Reset default and confirm Hippo defaults return.
6. Open Metadata Studio, Access Control Manager, CRM Dashboard, and GRN list and confirm there are no owner/admin permission errors.

## Remaining gaps

- Browser screenshots were not captured because this environment lacks a configured remote/authenticated browser session.
- Favicon application is implemented in the shell when a saved favicon URL exists; broader asset validation can be expanded later.
- Theme Studio currently accepts URL paste, not file upload.
- Advanced metadata tables still exist by design for inspection; they are now de-emphasized in copy.
