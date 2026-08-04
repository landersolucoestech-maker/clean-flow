import type ExcelJS from "exceljs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 200;

export type SpreadsheetRow = Record<string, string | number | undefined>;

function formatDateUtc(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeSpreadsheetCell(
  value: ExcelJS.CellValue,
): string | number | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return formatDateUtc(value);

  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }

  if ("text" in value) return value.text;

  if ("result" in value) {
    return normalizeSpreadsheetCell(value.result);
  }

  if ("error" in value) return value.error;
  return undefined;
}

export function worksheetToRows(worksheet: ExcelJS.Worksheet): SpreadsheetRow[] {
  if (worksheet.rowCount > MAX_ROWS + 1) {
    throw new Error(`The spreadsheet exceeds the ${MAX_ROWS.toLocaleString()} row limit.`);
  }

  const headerRow = worksheet.getRow(1);
  if (headerRow.cellCount > MAX_COLUMNS) {
    throw new Error(`The spreadsheet exceeds the ${MAX_COLUMNS} column limit.`);
  }

  const headers: string[] = [];
  for (let column = 1; column <= headerRow.cellCount; column += 1) {
    const header = normalizeSpreadsheetCell(headerRow.getCell(column).value);
    headers.push(header == null ? "" : String(header).trim());
  }

  if (!headers.some(Boolean)) return [];

  const rows: SpreadsheetRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const worksheetRow = worksheet.getRow(rowNumber);
    const record: SpreadsheetRow = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) return;
      const value = normalizeSpreadsheetCell(worksheetRow.getCell(index + 1).value);
      record[header] = value;
      if (value !== undefined && value !== "") hasValue = true;
    });

    if (hasValue) rows.push(record);
  }

  return rows;
}

export function parseCsvText(text: string): SpreadsheetRow[] {
  const rawRows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      rawRows.push(row);
      row = [];
      value = "";
      if (rawRows.length > MAX_ROWS + 1) {
        throw new Error(`The CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit.`);
      }
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unterminated quoted field.");
  if (value || row.length) {
    row.push(value);
    rawRows.push(row);
  }

  const [rawHeaders = [], ...dataRows] = rawRows;
  if (rawHeaders.length > MAX_COLUMNS) {
    throw new Error(`The CSV exceeds the ${MAX_COLUMNS} column limit.`);
  }

  const headers = rawHeaders.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim(),
  );

  return dataRows.flatMap((values) => {
    const record: SpreadsheetRow = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) return;
      const cell = values[index]?.trim();
      record[header] = cell || undefined;
      if (cell) hasValue = true;
    });

    return hasValue ? [record] : [];
  });
}

export async function readSpreadsheetFile(file: File): Promise<SpreadsheetRow[]> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("The spreadsheet must be 10 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseCsvText(await file.text());
  if (extension !== "xlsx") {
    throw new Error("Unsupported file type. Use an .xlsx or .csv file.");
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await workbook.xlsx.load(bytes as unknown as Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  return worksheetToRows(worksheet);
}
