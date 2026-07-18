import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { getReceipt } from "../../../services/receiptService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CustomerReceipt() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    loadReceipt();
  }, []);

async function loadReceipt() {
  if (!id) return;

  const bookingId = Number(id);

  console.log("Receipt URL ID:", bookingId);

  try {
    const data = await getReceipt(bookingId);

    console.log("Receipt Data:", data);

    setReceipt(data);

  } catch (error) {
    console.error("Receipt loading error:", error);
  }
}
  function printReceipt() {
    window.print();
  }

  function downloadPDF() {
    if (!receipt) return;
    
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("LivelihoodGo", 14, 18);

    doc.setFontSize(14);
    doc.text("Payment Receipt", 14, 28);

    autoTable(doc, {
      startY: 38,
      head: [
        ["Field", "Value"]
      ],
      body: [
        ["Receipt ID", receipt.id],
        ["Booking ID", receipt.booking.id],
        [
          "Customer",
          `${receipt.customer.first_name} ${receipt.customer.last_name}`
        ],
        [
          "Worker",
          `${receipt.worker.first_name} ${receipt.worker.last_name}`
        ],
        ["Service", receipt.booking.service_name],
        ["Category", receipt.booking.category],
        ["Booking Date", receipt.booking.booking_date],
        ["Booking Time", receipt.booking.booking_time],
        ["Payment Method", receipt.payment_method],
        ["Payment Status", receipt.payment_status],
        ["Amount", `₱${receipt.amount}`],
      ],
    });

    doc.save(`Receipt-${receipt.id}.pdf`);
  }

  if (!receipt) {
    return (
      <CustomerLayout>
        <div className="p-10">
          Loading receipt...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto bg-white shadow rounded-3xl p-10">

        <h1 className="text-4xl font-bold text-center mb-10">
          Payment Receipt
        </h1>

        <div className="space-y-5">
          <Row label="Receipt ID" value={receipt.id} />
          <Row label="Booking ID" value={receipt.booking.id} />
          <Row
            label="Customer"
            value={`${receipt.customer.first_name} ${receipt.customer.last_name}`}
          />
          <Row
            label="Worker"
            value={`${receipt.worker.first_name} ${receipt.worker.last_name}`}
          />
          <Row label="Service" value={receipt.booking.service_name} />
          <Row label="Category" value={receipt.booking.category} />
          <Row label="Booking Date" value={receipt.booking.booking_date} />
          <Row label="Booking Time" value={receipt.booking.booking_time} />
          <Row label="Payment Method" value={receipt.payment_method} />
          <Row label="Payment Status" value={receipt.payment_status} />
          <Row label="Amount" value={`₱${receipt.amount}`} />
        </div>

        <div className="flex gap-5 mt-10">
          <button
            onClick={printReceipt}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
          >
            🖨️ Print Receipt
          </button>

          <button
            onClick={downloadPDF}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
          >
            📄 Download PDF
          </button>
        </div>

      </div>
    </CustomerLayout>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="flex justify-between border-b pb-3">
      <span className="font-semibold">
        {label}
      </span>

      <span>
        {value}
      </span>
    </div>
  );
}