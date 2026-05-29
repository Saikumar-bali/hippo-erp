export const DOCUMENT_LIFECYCLE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "posted",
  "cancelled",
  "rejected",
  "in_transit",
  "completed"
] as const;

export type DocumentLifecycleStatus = (typeof DOCUMENT_LIFECYCLE_STATUSES)[number];

export const DOCUMENT_ACTIONS = [
  "create",
  "edit",
  "submit",
  "approve",
  "post",
  "cancel",
  "reject",
  "delete",
  "export"
] as const;

export type DocumentAction = (typeof DOCUMENT_ACTIONS)[number];

export const STANDARD_TRANSACTIONAL_DOCUMENT_FIELDS = [
  "id",
  "company_id",
  "document_number",
  "status",
  "workflow_state",
  "created_by",
  "created_at",
  "updated_at",
  "posted_at",
  "cancelled_at"
] as const;

export const NAMING_SERIES_EXAMPLES = [
  "GRN-YYYY-00001",
  "ST-YYYY-00001",
  "ADJ-YYYY-00001",
  "CC-YYYY-00001",
  "RES-YYYY-00001"
] as const;

export const ERP_STANDARD_SCREEN_CONVENTIONS = [
  "List view",
  "Create form",
  "Edit/detail form",
  "Report view",
  "Audit/history section"
] as const;

export const NAMES_SERIES_GENERATION_PREFERENCE = [
  "Prefer Postgres RPC for transaction-safe numbering.",
  "Use a Supabase Edge Function only when extra server orchestration is required."
] as const;
