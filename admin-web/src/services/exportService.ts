import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportToPDF(summary: any) {
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

export function exportToExcel(summary: any) {
  const data = [
    {
      Workers: summary.workers,
      Customers: summary.customers,
      Bookings: summary.bookings,
      Completed: summary.completed,
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Reports"
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const file = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(file, "LivelihoodGo-Report.xlsx");
}