-- company_profile_flow.sql
-- Validates company profile read/write with company-scoped data and safe rollback.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('90000000-0000-0000-0000-000000000101','authenticated','authenticated','company-sim@example.com','{"full_name":"Company Simulation User"}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;

insert into app.tenants (id, name, slug, gst_number, email, phone, address, logo_url, industry_type, currency_code, financial_year_start)
values (
  '90000000-0000-0000-0000-000000000110',
  'Simulation Company',
  'simulation-company',
  '29ABCDE1234F2Z5',
  'ops@simulation-company.com',
  '+919876543210',
  '44 Industrial Belt, Pune',
  'https://example.com/sim-company.png',
  'Manufacturing',
  'INR',
  '2026-04-01'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  gst_number = excluded.gst_number,
  email = excluded.email,
  phone = excluded.phone,
  address = excluded.address,
  logo_url = excluded.logo_url,
  industry_type = excluded.industry_type,
  currency_code = excluded.currency_code,
  financial_year_start = excluded.financial_year_start;

insert into app.tenant_members (tenant_id, user_id, role, is_active)
values ('90000000-0000-0000-0000-000000000110','90000000-0000-0000-0000-000000000101','admin',true)
on conflict (tenant_id, user_id) do update set role='admin', is_active=true;

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000101', true);

-- Positive read
select id, name, slug, gst_number, email, phone, address, logo_url, industry_type, currency_code, financial_year_start
from app.tenants
where id = '90000000-0000-0000-0000-000000000110';

-- Positive update
update app.tenants
set
  name = 'Simulation Company Updated',
  email = 'finance@simulation-company.com',
  phone = '+919999888777',
  updated_at = now()
where id = '90000000-0000-0000-0000-000000000110';

select name, email, phone
from app.tenants
where id = '90000000-0000-0000-0000-000000000110';

-- Negative sanity: bad GST format should not be used by application validation
-- update app.tenants set gst_number = 'INVALIDGST' where id = '90000000-0000-0000-0000-000000000110';

rollback;
