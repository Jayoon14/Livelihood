import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export interface ReportSummary {
  workers: number;
  customers: number;
  bookings: number;
  completed: number;
}

function validateSummary(summary: ReportSummary): void {
  const fields: (keyof ReportSummary)[] = [
    "workers",
    "customers",
    "bookings",
    "completed",
  ];

  for (const field of fields) {
    const value = summary[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid value for ${field}.`);
    }
  }
}

export function exportToPDF(summary: ReportSummary): void {
  validateSummary(summary);

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("LivelihoodGo Report", 14, 20);

  autoTable(doc, {
    startY: 35,
    head: [["Report", "Value"]],
    body: [
      ["Workers", summary.workers],
      ["Customers", summary.customers],
      ["Bookings", summary.bookings],
      ["Completed", summary.completed],
    ],
  });

  doc.save("LivelihoodGo-Report.pdf");
}

export function exportToExcel(summary: ReportSummary): void {
  validateSummary(summary);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      Workers: summary.workers,
      Customers: summary.customers,
      Bookings: summary.bookings,
      Completed: summary.completed,
    },
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "LivelihoodGo-Report.xlsx",
  );
}