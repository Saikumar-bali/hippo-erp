alter table app.tenants
  add column if not exists gst_number text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists logo_url text,
  add column if not exists industry_type text,
  add column if not exists currency_code text,
  add column if not exists financial_year_start date;

comment on column app.tenants.gst_number is 'Company GST number (user-facing company profile field).';
comment on column app.tenants.email is 'Company contact email (user-facing company profile field).';
comment on column app.tenants.phone is 'Company contact phone (user-facing company profile field).';
comment on column app.tenants.address is 'Company registered/operational address (user-facing company profile field).';
comment on column app.tenants.logo_url is 'Company logo URL (user-facing company profile field).';
comment on column app.tenants.industry_type is 'Company industry category (user-facing company profile field).';
comment on column app.tenants.currency_code is 'Company operating currency code (ISO-like, e.g. INR/USD).';
comment on column app.tenants.financial_year_start is 'Company financial year start date.';
