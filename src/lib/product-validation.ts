export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateCategoryCode(code: string): string | null {
  if (!code) return "Category code is required.";
  if (code.length > 50) return "Category code must be 50 characters or fewer.";
  return null;
}

export function validateCategoryName(name: string): string | null {
  if (!name) return "Category name is required.";
  if (name.length > 200) return "Category name must be 200 characters or fewer.";
  return null;
}

export function validateCategoryForm(data: {
  code: string;
  name: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const codeErr = validateCategoryCode(data.code);
  if (codeErr) errors.code = codeErr;
  const nameErr = validateCategoryName(data.name);
  if (nameErr) errors.name = nameErr;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateUomCode(code: string): string | null {
  if (!code) return "UOM code is required.";
  if (code.length > 20) return "UOM code must be 20 characters or fewer.";
  return null;
}

export function validateUomName(name: string): string | null {
  if (!name) return "UOM name is required.";
  if (name.length > 100) return "UOM name must be 100 characters or fewer.";
  return null;
}

export function validateUomForm(data: {
  code: string;
  name: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const codeErr = validateUomCode(data.code);
  if (codeErr) errors.code = codeErr;
  const nameErr = validateUomName(data.name);
  if (nameErr) errors.name = nameErr;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSku(sku: string): string | null {
  if (!sku) return "SKU is required.";
  if (sku.length > 100) return "SKU must be 100 characters or fewer.";
  return null;
}

export function validateProductName(name: string): string | null {
  if (!name) return "Product name is required.";
  if (name.length > 500) return "Product name must be 500 characters or fewer.";
  return null;
}

export function validateReorderPoint(value: number): string | null {
  if (value < 0) return "Reorder point must be zero or positive.";
  if (!Number.isFinite(value)) return "Reorder point must be a valid number.";
  return null;
}

export function validateReorderQuantity(value: number): string | null {
  if (value < 0) return "Reorder quantity must be zero or positive.";
  if (!Number.isFinite(value)) return "Reorder quantity must be a valid number.";
  return null;
}

export function validateProductForm(data: {
  sku: string;
  name: string;
  category_id: string;
  uom_id: string;
  reorder_point: number;
  reorder_quantity: number;
  batch_tracking: boolean;
  expiry_tracking: boolean;
}): ValidationResult {
  const errors: Record<string, string> = {};
  const skuErr = validateSku(data.sku);
  if (skuErr) errors.sku = skuErr;
  const nameErr = validateProductName(data.name);
  if (nameErr) errors.name = nameErr;
  if (!data.category_id) errors.category_id = "Category is required.";
  if (!data.uom_id) errors.uom_id = "UOM is required.";
  const rpErr = validateReorderPoint(data.reorder_point);
  if (rpErr) errors.reorder_point = rpErr;
  const rqErr = validateReorderQuantity(data.reorder_quantity);
  if (rqErr) errors.reorder_quantity = rqErr;
  if (data.expiry_tracking && !data.batch_tracking) {
    errors.expiry_tracking = "Expiry tracking requires batch tracking to be enabled.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
