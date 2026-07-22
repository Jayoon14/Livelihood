import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Hash,
  PhilippinePeso,
  Printer,
  ReceiptText,
  UserRound,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { getReceipt } from "../../../services/receiptService";

/* ==========================
   TYPES
========================== */

type ApprovedTransaction = {
  id: number;
  amount: number | string;
  payment_method?: string | null;
  reference_number?: string | null;
  transaction_status?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

type ReceiptData = {
  id: number;
  booking_id: number;

  amount: number | string;
  total_amount: number;
  amount_paid: number;
  balance: number;

  payment_status: string;
  payment_method?: string | null;
  reference_number?: string | null;

  created_at?: string | null;

  booking?: {
    id?: number;
    booking_date?: string | null;
    booking_time?: string | null;
    address?: string | null;

    services?: {
      service_name?: string | null;
    } | null;
  } | null;

  customer?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;

  worker?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;

  approved_transactions?: ApprovedTransaction[];
};

/* ==========================
   COMPONENT
========================== */

export default function CustomerReceipt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadReceipt();
  }, [id]);

  async function loadReceipt() {
    try {
      setLoading(true);
      setErrorMessage("");
      setReceipt(null);

      if (!id) {
        throw new Error("Booking ID is missing.");
      }

      const bookingId = Number(id);

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        throw new Error("Invalid booking ID.");
      }

      const data = await getReceipt(bookingId);

      setReceipt(data as ReceiptData);
    } catch (error) {
      console.error("Receipt loading error:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this receipt.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================
     FORMATTERS
  ========================== */

  function formatCurrency(value: number | string | null | undefined) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  function formatDate(value?: string | null) {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(value?: string | null) {
    if (!value) {
      return "Not available";
    }

    const parsedDate = new Date(`1970-01-01T${value}`);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getCustomerName() {
    const firstName = receipt?.customer?.first_name?.trim() ?? "";

    const lastName = receipt?.customer?.last_name?.trim() ?? "";

    return `${firstName} ${lastName}`.trim() || "Customer unavailable";
  }

  function getWorkerName() {
    const firstName = receipt?.worker?.first_name?.trim() ?? "";

    const lastName = receipt?.worker?.last_name?.trim() ?? "";

    return `${firstName} ${lastName}`.trim() || "Worker unavailable";
  }

  function getServiceName() {
    return receipt?.booking?.services?.service_name ?? "Service unavailable";
  }

  /* ==========================
     PAYMENT COMPUTATION
  ========================== */

  function getApprovedTransactions() {
    return receipt?.approved_transactions ?? [];
  }

  function getTransactionTotal() {
    return getApprovedTransactions().reduce(
      (total, transaction) => total + Number(transaction.amount ?? 0),
      0,
    );
  }

  function getComputedBalance() {
    const totalAmount = Number(receipt?.total_amount ?? receipt?.amount ?? 0);

    return Math.max(totalAmount - getTransactionTotal(), 0);
  }

  function getPaymentCountLabel() {
    const count = getApprovedTransactions().length;

    return `${count} ${count === 1 ? "transaction" : "transactions"}`;
  }

  /* ==========================
     ACTIONS
  ========================== */

  function printReceipt() {
    window.print();
  }

  function downloadPDF() {
    if (!receipt) {
      return;
    }

    const transactions = getApprovedTransactions();
    const transactionTotal = getTransactionTotal();
    const remainingBalance = getComputedBalance();

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("LivelihoodGo", 14, 18);

    doc.setFontSize(13);
    doc.text("Official Payment Receipt", 14, 27);

    doc.setFontSize(10);
    doc.text(
      `Receipt #${receipt.id} | Booking #${
        receipt.booking?.id ?? receipt.booking_id
      }`,
      14,
      34,
    );

    /*
     * Receipt and booking information
     */
    autoTable(doc, {
      startY: 42,

      head: [["Receipt Information", "Details"]],

      body: [
        ["Receipt ID", `#${receipt.id}`],

        ["Booking ID", `#${receipt.booking?.id ?? receipt.booking_id}`],

        ["Customer", getCustomerName()],

        ["Worker", getWorkerName()],

        ["Service", getServiceName()],

        ["Booking Date", formatDate(receipt.booking?.booking_date)],

        ["Booking Time", formatTime(receipt.booking?.booking_time)],

        ["Service Address", receipt.booking?.address ?? "Not available"],

        ["Payment Status", receipt.payment_status],

        ["Number of Payments", getPaymentCountLabel()],
      ],

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },

      headStyles: {
        fontStyle: "bold",
      },

      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: 65,
        },
      },
    });

    const receiptInfoFinalY = (doc as any).lastAutoTable?.finalY ?? 120;

    /*
     * Payment transaction table
     */
    doc.setFontSize(13);
    doc.text("Payment Transactions", 14, receiptInfoFinalY + 14);

    autoTable(doc, {
      startY: receiptInfoFinalY + 20,

      head: [
        ["#", "Payment Method", "Reference Number", "Payment Date", "Amount"],
      ],

      body:
        transactions.length > 0
          ? transactions.map((transaction, index) => [
              String(index + 1),

              transaction.payment_method || "Not specified",

              transaction.reference_number || "Not applicable",

              formatDate(transaction.approved_at ?? transaction.created_at),

              formatCurrency(transaction.amount),
            ])
          : [["-", "No approved transaction", "-", "-", formatCurrency(0)]],

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },

      headStyles: {
        fontStyle: "bold",
      },

      columnStyles: {
        0: {
          cellWidth: 12,
          halign: "center",
        },

        1: {
          cellWidth: 38,
        },

        2: {
          cellWidth: 42,
        },

        3: {
          cellWidth: 42,
        },

        4: {
          cellWidth: 35,
          halign: "right",
        },
      },
    });

    const transactionFinalY =
      (doc as any).lastAutoTable?.finalY ?? receiptInfoFinalY + 80;

    /*
     * Payment computation
     */
    autoTable(doc, {
      startY: transactionFinalY + 8,

      body: [
        ["Total Service Fee", formatCurrency(receipt.total_amount)],

        ["Number of Payments", String(transactions.length)],

        ["Total Paid", formatCurrency(transactionTotal)],

        ["Remaining Balance", formatCurrency(remainingBalance)],

        ["Payment Status", receipt.payment_status || "Paid"],
      ],

      theme: "grid",

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },

      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: 85,
        },

        1: {
          fontStyle: "bold",
          halign: "right",
        },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 220;

    doc.setFontSize(9);

    doc.text(
      "This receipt confirms all approved payments made for this booking.",
      14,
      finalY + 12,
    );

    doc.text("Thank you for using LivelihoodGo.", 14, finalY + 19);

    doc.save(`LivelihoodGo-Receipt-${receipt.id}.pdf`);
  }

  /* ==========================
     LOADING STATE
  ========================== */

  if (loading) {
    return (
      <CustomerLayout>
        <div className="min-h-[70vh] bg-gray-50 px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              Loading receipt
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Please wait while we retrieve your payment information.
            </p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  /* ==========================
     ERROR STATE
  ========================== */

  if (errorMessage || !receipt) {
    return (
      <CustomerLayout>
        <div className="min-h-[70vh] bg-gray-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <ReceiptText size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Receipt unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              {errorMessage || "Unable to load this receipt."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/customer/payments")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <ArrowLeft size={17} />
              Return to Payment History
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-full bg-gray-50/80 px-4 py-6 sm:px-6 lg:px-8 print:bg-white print:p-0">
        <div className="mx-auto w-full max-w-[1800px]">

          {/* ==========================
              TOP NAVIGATION
          ========================== */}

          <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={printReceipt}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Printer size={18} />

                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={downloadPDF}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Download size={18} />

                <span className="hidden sm:inline">Download PDF</span>
              </button>
            </div>
          </div>

          {/* ==========================
              RECEIPT CARD
          ========================== */}

          <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg print:rounded-none print:border-0 print:shadow-none">
            {/* ==========================
                HEADER
            ========================== */}

            <header className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white sm:px-10">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />

              <div className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-white/5" />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <ReceiptText size={28} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                      LivelihoodGo
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight">
                      Payment Receipt
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-6 text-blue-100">
                      Official confirmation of your completed service payment.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                    Receipt Number
                  </p>

                  <p className="mt-1 text-xl font-bold">#{receipt.id}</p>
                </div>
              </div>
            </header>

            {/* ==========================
                PAID STATUS
            ========================== */}

            <div className="border-b border-gray-100 bg-emerald-50 px-6 py-4 sm:px-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={22} />
                  </div>

                  <div>
                    <p className="font-bold text-emerald-800">
                      Payment completed
                    </p>

                    <p className="text-sm text-emerald-700">
                      This booking has been fully paid through{" "}
                      {getPaymentCountLabel()}.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {receipt.payment_status}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              {/* ==========================
                  PAYMENT PARTIES
              ========================== */}

              <section>
                <SectionTitle title="Payment Parties" />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={UserRound}
                    label="Customer"
                    value={getCustomerName()}
                  />

                  <InfoCard
                    icon={BriefcaseBusiness}
                    label="Worker"
                    value={getWorkerName()}
                  />
                </div>
              </section>

              {/* ==========================
                  BOOKING INFORMATION
              ========================== */}

              <section className="mt-8">
                <SectionTitle title="Booking Information" />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={Hash}
                    label="Booking ID"
                    value={`#${receipt.booking?.id ?? receipt.booking_id}`}
                  />

                  <InfoCard
                    icon={BriefcaseBusiness}
                    label="Service"
                    value={getServiceName()}
                  />

                  <InfoCard
                    icon={CalendarDays}
                    label="Booking Date"
                    value={formatDate(receipt.booking?.booking_date)}
                  />

                  <InfoCard
                    icon={Clock3}
                    label="Booking Time"
                    value={formatTime(receipt.booking?.booking_time)}
                  />
                </div>

                {receipt.booking?.address && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Service Address
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {receipt.booking.address}
                    </p>
                  </div>
                )}
              </section>

              {/* ==========================
                  PAYMENT TRANSACTIONS
              ========================== */}

              <section className="mt-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle title="Payment Transactions" />

                  <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {getPaymentCountLabel()}
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                  {/* DESKTOP TABLE HEADER */}

                  <div className="hidden grid-cols-[50px_1fr_1fr_150px] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 md:grid">
                    <span>#</span>

                    <span>Payment Method</span>

                    <span>Reference and Date</span>

                    <span className="text-right">Amount</span>
                  </div>

                  {/* TRANSACTION ROWS */}

                  <div className="divide-y divide-gray-100">
                    {getApprovedTransactions().map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className="grid gap-4 bg-white px-5 py-5 md:grid-cols-[50px_1fr_1fr_150px] md:items-center"
                      >
                        {/* NUMBER */}

                        <div className="hidden md:block">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {index + 1}
                          </span>
                        </div>

                        {/* PAYMENT METHOD */}

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 md:hidden">
                            Payment Method
                          </p>

                          <div className="mt-1 flex items-center gap-3 md:mt-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <CreditCard size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="break-words font-bold text-gray-900">
                                {transaction.payment_method || "Not specified"}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                Approved payment
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* REFERENCE AND DATE */}

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 md:hidden">
                            Reference and Date
                          </p>

                          <p className="mt-1 break-all text-sm font-semibold text-gray-700 md:mt-0">
                            {transaction.reference_number || "Not applicable"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(
                              transaction.approved_at ?? transaction.created_at,
                            )}
                          </p>
                        </div>

                        {/* AMOUNT */}

                        <div className="flex items-end justify-between gap-4 md:block">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 md:hidden">
                            Amount
                          </p>

                          <p className="text-xl font-bold text-emerald-600 md:text-right">
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {getApprovedTransactions().length === 0 && (
                      <div className="px-5 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                          <CreditCard size={22} />
                        </div>

                        <p className="mt-4 font-semibold text-gray-800">
                          No approved transactions found
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Approved payment records will appear here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* TRANSACTION TOTAL */}

                  <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        Total from approved transactions
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Sum of all approved partial payments
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(getTransactionTotal())}
                    </p>
                  </div>
                </div>
              </section>
              

              {/* ==========================
                  PAYMENT SUMMARY
              ========================== */}

              <section className="mt-8">
                <div className="overflow-hidden rounded-2xl bg-slate-950 text-white">
                  <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-300">
                        <PhilippinePeso size={21} />
                      </div>

                      <div>
                        <h2 className="font-bold">Payment Summary</h2>

                        <p className="text-xs text-slate-400">
                          Complete payment computation
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-6 py-6">
                    <AmountRow
                      label="Total Service Fee"
                      value={formatCurrency(receipt.total_amount)}
                    />

                    {/* PAYMENT BREAKDOWN */}

                    <div className="space-y-3 border-t border-white/10 pt-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Payment Breakdown
                      </p>

                      {getApprovedTransactions().map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between gap-5"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-slate-300">
                              {transaction.payment_method || "Payment"} #
                              {index + 1}
                            </p>

                            <p className="mt-0.5 break-all text-xs text-slate-500">
                              {transaction.reference_number ||
                                "No reference number"}
                            </p>
                          </div>

                          <span className="shrink-0 font-semibold text-white">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* TOTAL PAID */}

                    <div className="border-t border-dashed border-white/20 pt-5">
                      <AmountRow
                        label="Total Paid"
                        value={formatCurrency(getTransactionTotal())}
                        emphasized
                      />
                    </div>

                    {/* REMAINING BALANCE */}

                    <AmountRow
                      label="Remaining Balance"
                      value={formatCurrency(getComputedBalance())}
                      success
                    />

                    {/* TRANSACTION COUNT */}

                    <div className="flex items-center justify-between gap-5 border-t border-white/10 pt-4">
                      <span className="text-sm text-slate-400">
                        Number of Payments
                      </span>

                      <span className="font-semibold text-slate-200">
                        {getApprovedTransactions().length}
                      </span>
                    </div>

                    {/* STATUS */}

                    <div className="flex items-center justify-between gap-5 border-t border-white/10 pt-4">
                      <span className="text-sm text-slate-400">
                        Payment Status
                      </span>

                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {receipt.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==========================
                  FOOTER MESSAGE
              ========================== */}

              <footer className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-center">
                <p className="text-sm font-semibold text-blue-900">
                  Thank you for using LivelihoodGo.
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-600">
                  Keep this receipt as proof of all approved payments made for
                  this booking.
                </p>
              </footer>

              {/* ==========================
                  MOBILE ACTIONS
              ========================== */}

              <div className="mt-6 grid gap-3 sm:hidden print:hidden">
                <button
                  type="button"
                  onClick={printReceipt}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  <Printer size={18} />
                  Print Receipt
                </button>

                <button
                  type="button"
                  onClick={downloadPDF}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </CustomerLayout>
  );
}

/* ==========================
   SMALL COMPONENTS
========================== */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 text-lg font-bold text-gray-900">{title}</h2>

      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

/* ==========================
   INFO CARD
========================== */

type InfoCardProps = {
  icon: typeof UserRound;
  label: string;
  value: React.ReactNode;
};

function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
/* ==========================
   AMOUNT ROW
========================== */

type AmountRowProps = {
  label: string;
  value: string;
  emphasized?: boolean;
  success?: boolean;
};

function AmountRow({
  label,
  value,
  emphasized = false,
  success = false,
}: AmountRowProps) {
  let labelClass = "text-sm text-slate-400";

  let valueClass = "font-semibold text-slate-200";

  if (emphasized) {
    labelClass = "font-semibold text-white";

    valueClass = "text-xl font-bold text-white";
  }

  if (success) {
    labelClass = "font-semibold text-emerald-300";

    valueClass = "text-xl font-bold text-emerald-400";
  }

  return (
    <div className="flex items-center justify-between gap-5">
      <span className={labelClass}>{label}</span>

      <span className={valueClass}>{value}</span>
    </div>
  );
}
