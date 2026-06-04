export interface PrintSection {
  label: string;
  fields: string[];
}

export interface PrintLayout {
  sections: PrintSection[];
}

export interface PrintFormat {
  id: string;
  tenant_id: string;
  doctype_key: string;
  format_key: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  layout_json: PrintLayout;
  header_json: Record<string, any>;
  footer_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}
