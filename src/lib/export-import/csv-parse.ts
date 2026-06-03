export type CsvParseResult = {
  headers: string[];
  rows: string[][];
  errors: { row: number; message: string }[];
};

export function parseCsv(text: string): CsvParseResult {
  const lines = splitLines(text);
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [] };
  }

  const headers = parseLine(lines[0]);
  const errors: { row: number; message: string }[] = [];
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    try {
      const values = parseLine(line);
      if (values.length !== headers.length) {
        errors.push({
          row: i + 1,
          message: `Column count mismatch: expected ${headers.length}, got ${values.length}`,
        });
      }
      rows.push(values);
    } catch (e) {
      errors.push({
        row: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse row",
      });
    }
  }

  return { headers, rows, errors };
}

function splitLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += '"';
      }
    } else if (ch === "\r" && next === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
      i++;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  if (current !== "" || text.endsWith("\n")) {
    lines.push(current);
  }

  return lines;
}

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values;
}
