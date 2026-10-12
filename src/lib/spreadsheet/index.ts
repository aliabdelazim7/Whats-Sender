import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawRowData } from '../../types';

export interface ParsedSpreadsheet {
  sheets: string[];
  selectedSheet: string;
  headers: string[];
  rows: RawRowData[];
}

/**
 * Safely parses an uploaded spreadsheet or CSV without running macros or executing arbitrary formulas.
 */
export async function parseSpreadsheetFile(
  file: File,
  sheetName?: string
): Promise<ParsedSpreadsheet> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            reject(new Error(results.errors[0].message));
            return;
          }
          const headers = results.meta.fields || [];
          resolve({
            sheets: ['Default'],
            selectedSheet: 'Default',
            headers: headers.filter(h => Boolean(h && h.trim())),
            rows: results.data as RawRowData[],
          });
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  // Handle XLSX / XLS using SheetJS safely (disable formula evaluation where possible)
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellFormula: false, // Prevent evaluation of untrusted formulas
    cellHTML: false,
    cellText: true,
    raw: false, // Keep formatted strings to avoid losing leading 0 in phone numbers!
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in this spreadsheet file.');
  }

  const targetSheet = sheetName && workbook.SheetNames.includes(sheetName)
    ? sheetName
    : workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheet];
  if (!worksheet) {
    throw new Error(`Worksheet "${targetSheet}" is empty or could not be loaded.`);
  }

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json<RawRowData>(worksheet, {
    raw: false,
    defval: '',
  });

  // Extract headers accurately
  let headers: string[] = [];
  if (jsonData.length > 0) {
    headers = Object.keys(jsonData[0]);
  } else {
    // If empty rows, try reading sheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (cell && cell.v) headers.push(String(cell.v));
    }
  }

  return {
    sheets: workbook.SheetNames,
    selectedSheet: targetSheet,
    headers: headers.filter(h => Boolean(h && h.trim())),
    rows: jsonData,
  };
}
