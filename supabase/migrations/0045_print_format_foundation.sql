-- Phase 6.3: Print Format Foundation

CREATE TABLE IF NOT EXISTS app.erp_print_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    doctype_key TEXT NOT NULL REFERENCES app.erp_doctypes(doctype_key) ON DELETE CASCADE,
    format_key TEXT NOT NULL,
    label TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    layout_json JSONB NOT NULL DEFAULT '{"sections": []}',
    header_json JSONB NOT NULL DEFAULT '{}',
    footer_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, doctype_key, format_key)
);

-- Ensure only one default per tenant/doctype
CREATE UNIQUE INDEX IF NOT EXISTS erp_print_formats_one_default_idx 
ON app.erp_print_formats (tenant_id, doctype_key) 
WHERE is_default = true;

-- RLS
ALTER TABLE app.erp_print_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view print formats for their tenant" 
ON app.erp_print_formats FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM app.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users with manage_metadata can manage print formats" 
ON app.erp_print_formats FOR ALL
USING (
    tenant_id IN (SELECT tenant_id FROM app.tenant_members WHERE user_id = auth.uid())
    AND public.current_user_has_permission('manage_metadata')
);

-- Permissions
INSERT INTO app.permissions (permission_key, label, category)
VALUES 
('print_crm_lead', 'Print CRM Lead', 'CRM'),
('print_crm_opportunity', 'Print CRM Opportunity', 'CRM')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant permissions to Owner and Admin roles
INSERT INTO app.company_role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM app.company_roles r
CROSS JOIN (SELECT 'print_crm_lead' as permission_key UNION SELECT 'print_crm_opportunity') p
WHERE r.role_key IN ('owner', 'admin')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Seed Default Print Formats
-- Note: We need a valid tenant_id. We'll use a placeholder or handle it in the seeding script.
-- For the migration, we'll just define the structure.
-- Real seeding should happen for all existing tenants or via a function.

CREATE OR REPLACE FUNCTION app.seed_default_print_formats(target_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- CRM Lead Default
    INSERT INTO app.erp_print_formats (tenant_id, doctype_key, format_key, label, is_default, layout_json)
    VALUES (
        target_tenant_id, 
        'crm_lead', 
        'standard', 
        'Standard', 
        true, 
        '{
            "sections": [
                {
                    "label": "Lead Details",
                    "fields": ["lead_name", "company_name", "email", "phone"]
                },
                {
                    "label": "Qualification",
                    "fields": ["source", "status", "owner_name"]
                },
                {
                    "label": "Notes",
                    "fields": ["notes"]
                }
            ]
        }'::JSONB
    )
    ON CONFLICT (tenant_id, doctype_key, format_key) DO NOTHING;

    -- CRM Opportunity Default
    INSERT INTO app.erp_print_formats (tenant_id, doctype_key, format_key, label, is_default, layout_json)
    VALUES (
        target_tenant_id, 
        'crm_opportunity', 
        'standard', 
        'Standard', 
        true, 
        '{
            "sections": [
                {
                    "label": "Deal Details",
                    "fields": ["opportunity_name", "account_name", "contact_name"]
                },
                {
                    "label": "Forecast",
                    "fields": ["stage", "expected_value", "expected_close_date", "probability"]
                },
                {
                    "label": "Notes",
                    "fields": ["notes"]
                }
            ]
        }'::JSONB
    )
    ON CONFLICT (tenant_id, doctype_key, format_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Apply to all existing tenants
SELECT app.seed_default_print_formats(id) FROM app.tenants;
