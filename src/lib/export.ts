export type SheetRow = Record<string, string | number>;

/** Writes rows to an .xlsx file entirely in the browser. */
export const exportToExcel = async (rows: SheetRow[], fileName: string, sheetName = 'Sheet1'): Promise<void> => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
};
