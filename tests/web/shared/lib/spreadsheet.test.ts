import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { normalizeSpreadsheetCell, parseCsvText, worksheetToRows } from "./spreadsheet";

describe("spreadsheet helpers", () => {
  it("parses quoted CSV fields, escaped quotes and a UTF-8 BOM", () => {
    const rows = parseCsvText('\uFEFFName,Notes\r\n"Jane Doe","Uses ""green"" products"\r\n');

    expect(rows).toEqual([{ Name: "Jane Doe", Notes: 'Uses "green" products' }]);
  });

  it("rejects malformed quoted CSV fields", () => {
    expect(() => parseCsvText('Name,Notes\nJane,"unfinished')).toThrow(
      "unterminated quoted field",
    );
  });

  it("converts an Excel worksheet into keyed records", () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Customers");
    worksheet.addRow(["Name", "Revenue", "Active", "Joined"]);
    worksheet.addRow(["Jane Doe", 125.5, true, new Date("2026-08-04T00:00:00Z")]);

    expect(worksheetToRows(worksheet)).toEqual([
      { Name: "Jane Doe", Revenue: 125.5, Active: "TRUE", Joined: "2026-08-04" },
    ]);
  });

  it("uses cached formula results without evaluating formulas", () => {
    expect(normalizeSpreadsheetCell({ formula: "1+1", result: 2 })).toBe(2);
  });
});
