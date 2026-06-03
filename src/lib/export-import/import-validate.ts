import type { DocFieldMeta } from "../metadata/types";

export type ImportValidationError = {
  row: number;
  fieldname: string;
  message: string;
};

export type ImportValidationResult = {
  valid: boolean;
  errors: ImportValidationError[];
  validRows: Record<string, unknown>[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[\d\s()-]{6,20}$/;
const URL_PATTERN = /^https?:\/\/.+/;

export function validateImportRows(
  rows: string[][],
  headers: string[],
  fields: DocFieldMeta[],
): ImportValidationResult {
  const fieldMap = new Map<string, DocFieldMeta>();
  for (const f of fields) {
    fieldMap.set(f.label, f);
    fieldMap.set(f.fieldname, f);
  }

  const headerFieldMap: { label: string; field: DocFieldMeta }[] = [];
  for (const h of headers) {
    const cleanLabel = h.replace(/^\*+/, "").trim();
    const field = fieldMap.get(cleanLabel) ?? fieldMap.get(h);
    if (field) {
      headerFieldMap.push({ label: h, field });
    }
  }

  const errors: ImportValidationError[] = [];
  const validRows: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const record: Record<string, unknown> = {};
    let rowHasError = false;

    for (let ci = 0; ci < headerFieldMap.length && ci < row.length; ci++) {
      const { field } = headerFieldMap[ci];
      const rawValue = row[ci];
      const value = rawValue.trim();

      if (value === "" && field.is_required) {
        errors.push({
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} is required`,
        });
        rowHasError = true;
        continue;
      }

      if (value === "") continue;

      const validationError = validateField(value, field, rowNum);
      if (validationError) {
        errors.push(validationError);
        rowHasError = true;
        continue;
      }

      record[field.fieldname] = convertValue(value, field.fieldtype);
    }

    if (!rowHasError) {
      validRows.push(record);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validRows,
  };
}

function convertValue(value: string, fieldtype: string): unknown {
  switch (fieldtype) {
    case "Int":
      return parseInt(value, 10);
    case "Float":
      return parseFloat(value);
    case "Check":
      return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
    default:
      return value;
  }
}

function validateField(
  value: string,
  field: DocFieldMeta,
  rowNum: number,
): ImportValidationError | null {
  switch (field.fieldtype) {
    case "Int": {
      const n = parseInt(value, 10);
      if (isNaN(n) || String(n) !== value.trim()) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a whole number`,
        };
      }
      return null;
    }

    case "Float": {
      const n = parseFloat(value);
      if (isNaN(n)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a number`,
        };
      }
      return null;
    }

    case "Check": {
      const lower = value.toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no"].includes(lower)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be Yes/No or True/False`,
        };
      }
      return null;
    }

    case "Date": {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a valid date (e.g. YYYY-MM-DD)`,
        };
      }
      return null;
    }

    case "Datetime": {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a valid datetime`,
        };
      }
      return null;
    }

    case "Select": {
      const opts = field.options;
      let options: string[] = [];
      if (Array.isArray(opts)) {
        options = opts.map((o) => (typeof o === "string" ? o : ""));
      } else if (typeof opts === "object" && opts !== null) {
        const raw = (opts as Record<string, unknown>).options;
        if (Array.isArray(raw)) {
          options = raw.map((o) => String(o));
        }
      }
      if (options.length > 0 && !options.includes(value)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be one of: ${options.join(", ")}`,
        };
      }
      return null;
    }

    case "Link": {
      const emailOpt = field.options as Record<string, unknown>;
      if (emailOpt?.email === true && !EMAIL_PATTERN.test(value)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a valid email`,
        };
      }
      if (emailOpt?.phone === true && !PHONE_PATTERN.test(value)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a valid phone number`,
        };
      }
      if (emailOpt?.url === true && !URL_PATTERN.test(value)) {
        return {
          row: rowNum,
          fieldname: field.fieldname,
          message: `${field.label} must be a valid URL (http/https)`,
        };
      }
      return null;
    }

    default:
      return null;
  }
}
