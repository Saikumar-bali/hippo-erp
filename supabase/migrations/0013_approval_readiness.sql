-- Approval Readiness: Add cycle count variance approval permission
-- and document existing approval permissions for future workflows.

-- Add approve_cycle_count permission
insert into app.permissions (permission_key, module_key, module_label, permission_label, description, sort_order)
values ('approve_cycle_count', 'inventory', 'Inventory', 'Approve Cycle Count', 'Approve cycle count variance adjustments.', 55)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Grant approve_cycle_count to owner, admin, and warehouse_manager
insert into app.role_permission_grants (role, permission_key, is_granted)
select r.role, 'approve_cycle_count', true
from (values
  ('owner'::app.role_type),
  ('admin'::app.role_type),
  ('warehouse_manager'::app.role_type)
) as r(role)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- Note: The following approval permissions are already defined in migration 0007:
--   GRN:          qc_grn, approve_grn, post_grn
--   Inventory:    approve_adjustment, transfer_stock
--   Cycle Counts: approve_cycle_count (this migration)
--
-- Future workflow mapping:
--   qc_grn              -> GRN quality control step
--   approve_grn         -> GRN approval before posting
--   post_grn            -> Final GRN posting to inventory
--   approve_adjustment  -> Stock adjustment approval before posting
--   transfer_stock      -> Stock transfer creation and completion
--   approve_cycle_count -> Cycle count variance approval (future use)
