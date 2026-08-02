import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  approvePaymentTransaction,
  getAllPayments,
  rejectPaymentTransaction,
  type PaymentRecord,
  type PaymentTransaction,
} from "../../../services/paymentService";

const PAGE_SIZE = 10;

type StatusFilter = "All" | "Pending" | "Partially Paid" | "Paid" | "Rejected";

type DateFilter = "All" | "Today" | "This Week" | "This Month" | "Custom";

type SortOption =
  | "Newest"
  | "Oldest"
  | "Amount High"
  | "Amount Low"
  | "Customer A-Z"
  | "Worker A-Z"
  | "Status A-Z";

function money(value: unknown): string {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function numericAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function profileName(
  value: PaymentRecord["customer"] | PaymentRecord["worker"],
): string {
  const profile = Array.isArray(value) ? value[0] : value;

  if (!profile) {
    return "Unknown user";
  }

  return (
    [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" ") || "Unknown user"
  );
}

function profileId(
  value: PaymentRecord["customer"] | PaymentRecord["worker"],
): string | null {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.id ?? null;
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes("paid") && !normalized.includes("partial")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (normalized.includes("partial")) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }

  if (normalized.includes("reject")) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
}

function transactionStatusClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (normalized === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + difference);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isWithinDateRange(
  value: string | undefined,
  dateFilter: DateFilter,
  customStart: string,
  customEnd: string,
): boolean {
  if (dateFilter === "All") {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (dateFilter === "Today") {
    return date >= startOfDay(now) && date <= endOfDay(now);
  }

  if (dateFilter === "This Week") {
    return date >= startOfWeek(now) && date <= endOfDay(now);
  }

  if (dateFilter === "This Month") {
    return date >= startOfMonth(now) && date <= endOfDay(now);
  }

  if (dateFilter === "Custom") {
    const start = customStart
      ? startOfDay(new Date(`${customStart}T00:00:00`))
      : null;
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : null;

    if (start && date < start) {
      return false;
    }

    if (end && date > end) {
      return false;
    }

    return true;
  }

  return true;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("Newest");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingTransaction, setRejectingTransaction] =
    useState<PaymentTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPayments = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const records = await getAllPayments();
      setPayments(records);
      setLastUpdated(new Date());
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to load payments.";

      setError(message);

      if (!background) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    let mounted = true;

    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        if (mounted) {
          void loadPayments(true);
        }
      }, 300);
    };

    const channel = supabase
      .channel("admin-payments-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_transactions",
        },
        scheduleRealtimeRefresh,
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error("Admin payments realtime channel error.");
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error("Admin payments realtime connection timed out.");
        }
      });

    return () => {
      mounted = false;

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = payments.filter((payment) => {
      const matchesStatus =
        statusFilter === "All" || payment.payment_status === statusFilter;

      const matchesDate = isWithinDateRange(
        payment.created_at,
        dateFilter,
        customStart,
        customEnd,
      );

      const searchable = [
        payment.id,
        payment.booking_id,
        profileName(payment.customer),
        profileName(payment.worker),
        payment.payment_method,
        payment.payment_status,
        payment.reference_number,
        payment.verification_status,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      const matchesSearch = !term || searchable.includes(term);

      return matchesStatus && matchesDate && matchesSearch;
    });

    return [...filtered].sort((first, second) => {
      switch (sortOption) {
        case "Oldest":
          return (
            new Date(first.created_at ?? 0).getTime() -
            new Date(second.created_at ?? 0).getTime()
          );

        case "Amount High":
          return numericAmount(second.amount) - numericAmount(first.amount);

        case "Amount Low":
          return numericAmount(first.amount) - numericAmount(second.amount);

        case "Customer A-Z":
          return profileName(first.customer).localeCompare(
            profileName(second.customer),
          );

        case "Worker A-Z":
          return profileName(first.worker).localeCompare(
            profileName(second.worker),
          );

        case "Status A-Z":
          return first.payment_status.localeCompare(second.payment_status);

        case "Newest":
        default:
          return (
            new Date(second.created_at ?? 0).getTime() -
            new Date(first.created_at ?? 0).getTime()
          );
      }
    });
  }, [
    customEnd,
    customStart,
    dateFilter,
    payments,
    search,
    sortOption,
    statusFilter,
  ]);

  const totals = useMemo(() => {
    return filteredPayments.reduce(
      (summary, payment) => {
        summary.totalRecords += 1;
        summary.totalAmount += numericAmount(payment.amount);
        summary.totalPaid += numericAmount(payment.amount_paid);
        summary.totalBalance += numericAmount(payment.balance);

        if (payment.payment_status === "Pending") {
          summary.pending += 1;
        }

        if (payment.payment_status === "Partially Paid") {
          summary.partiallyPaid += 1;
        }

        if (payment.payment_status === "Paid") {
          summary.paid += 1;
        }

        if (payment.payment_status === "Rejected") {
          summary.rejected += 1;
        }

        return summary;
      },
      {
        totalRecords: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalBalance: 0,
        pending: 0,
        partiallyPaid: 0,
        paid: 0,
        rejected: 0,
      },
    );
  }, [filteredPayments]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );

  const visiblePayments = filteredPayments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter, customStart, customEnd, sortOption]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function approveTransaction(transaction: PaymentTransaction) {
    const confirmed = await confirmAction(
      `Approve ${money(transaction.amount)} via ${
        transaction.payment_method || "payment"
      }?`,
      {
        title: "Approve payment transaction",
        confirmText: "Approve",
      },
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(transaction.id);
    const toastId = toast.loading("Approving payment transaction...");

    try {
      await approvePaymentTransaction(transaction.id);
      toast.success("Payment transaction approved.", { id: toastId });
      await loadPayments(true);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Approval failed.",
        { id: toastId },
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function submitRejection() {
    if (!rejectingTransaction) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      toast.warning("Enter a rejection reason.");
      return;
    }

    setProcessingId(rejectingTransaction.id);

    const toastId = toast.loading("Rejecting payment transaction...");

    try {
      await rejectPaymentTransaction(rejectingTransaction.id, reason);

      toast.success("Payment transaction rejected.", { id: toastId });

      setRejectingTransaction(null);
      setRejectionReason("");
      await loadPayments(true);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Rejection failed.",
        { id: toastId },
      );
    } finally {
      setProcessingId(null);
    }
  }

  function exportCsv() {
    if (filteredPayments.length === 0) {
      toast.warning("There are no payment records to export.");
      return;
    }

    const headers = [
      "Payment ID",
      "Booking ID",
      "Customer",
      "Worker",
      "Total Amount",
      "Amount Paid",
      "Balance",
      "Payment Method",
      "Reference Number",
      "Payment Status",
      "Verification Status",
      "Created At",
    ];

    const rows = filteredPayments.map((payment) => [
      payment.id,
      payment.booking_id,
      profileName(payment.customer),
      profileName(payment.worker),
      numericAmount(payment.amount),
      numericAmount(payment.amount_paid),
      numericAmount(payment.balance),
      payment.payment_method ?? "",
      payment.reference_number ?? "",
      payment.payment_status,
      payment.verification_status,
      payment.created_at ?? "",
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `payments-${date}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    toast.success("CSV file exported.");
  }

  function printPayments() {
    if (filteredPayments.length === 0) {
      toast.warning("There are no payment records to print.");
      return;
    }

    window.print();
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("All");
    setCustomStart("");
    setCustomEnd("");
    setSortOption("Newest");
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Payments
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Verify payment transactions and monitor payment balances.
            </p>

            {lastUpdated && (
              <p className="mt-1 text-xs text-slate-400">
                Last updated: {formatDateTime(lastUpdated.toISOString())}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={printPayments}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <FileText className="h-4 w-4" />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={() => void loadPayments(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Records"
            value={totals.totalRecords.toLocaleString()}
            subtitle="Filtered payment records"
            icon={<FileText className="h-5 w-5" />}
          />

          <SummaryCard
            title="Total Amount"
            value={money(totals.totalAmount)}
            subtitle="Total amount due"
            icon={<Wallet className="h-5 w-5" />}
          />

          <SummaryCard
            title="Amount Paid"
            value={money(totals.totalPaid)}
            subtitle={`${totals.paid} fully paid`}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />

          <SummaryCard
            title="Pending"
            value={(totals.pending + totals.partiallyPaid).toLocaleString()}
            subtitle={`${totals.partiallyPaid} partially paid`}
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <SummaryCard
            title="Outstanding"
            value={money(totals.totalBalance)}
            subtitle={`${totals.rejected} rejected`}
            icon={<XCircle className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2 xl:grid-cols-[1.4fr_190px_180px_190px_auto] dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, booking, customer, worker, method..."
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Partially Paid</option>
            <option>Paid</option>
            <option>Rejected</option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value as DateFilter)
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700"
          >
            <option>All</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Custom</option>
          </select>

          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Amount High</option>
            <option>Amount Low</option>
            <option>Customer A-Z</option>
            <option>Worker A-Z</option>
            <option>Status A-Z</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Reset
          </button>

          {dateFilter === "Custom" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:col-span-5">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  Start date
                </span>

                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  max={customEnd || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  End date
                </span>

                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  min={customStart || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
                />
              </label>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading payments...
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>

              <button
                type="button"
                onClick={() => void loadPayments()}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : visiblePayments.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No payments match the current search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-290 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Customer / Worker</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Transactions</th>
                    <th className="px-4 py-3 print:hidden">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visiblePayments.map((payment) => {
                    const transactions = payment.payment_transactions ?? [];
                    const expanded = expandedId === payment.id;
                    const customerId = profileId(payment.customer);
                    const workerId = profileId(payment.worker);

                    return (
                      <tr key={payment.id} className="align-top">
                        <td colSpan={8} className="p-0">
                          <div className="grid min-w-290 grid-cols-[120px_1.7fr_120px_120px_120px_150px_120px_120px] items-center">
                            <div className="px-4 py-4">
                              <div className="font-bold">#{payment.id}</div>

                              <Link
                                to={`/bookings/${payment.booking_id}`}
                                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 print:text-slate-500"
                              >
                                Booking #{payment.booking_id}
                              </Link>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(payment.created_at)}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {customerId ? (
                                  <Link
                                    to={`/customers/${customerId}`}
                                    className="hover:text-blue-600 hover:underline"
                                  >
                                    {profileName(payment.customer)}
                                  </Link>
                                ) : (
                                  profileName(payment.customer)
                                )}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                Worker:{" "}
                                {workerId ? (
                                  <Link
                                    to={`/workers/${workerId}`}
                                    className="font-semibold hover:text-blue-600 hover:underline"
                                  >
                                    {profileName(payment.worker)}
                                  </Link>
                                ) : (
                                  profileName(payment.worker)
                                )}
                              </div>
                            </div>

                            <div className="px-4 py-4 font-semibold">
                              {money(payment.amount)}
                            </div>

                            <div className="px-4 py-4">
                              {money(payment.amount_paid)}
                            </div>

                            <div className="px-4 py-4">
                              {money(payment.balance)}
                            </div>

                            <div className="px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                                  payment.payment_status,
                                )}`}
                              >
                                {payment.payment_status}
                              </span>
                            </div>

                            <div className="px-4 py-4">
                              {transactions.length}
                            </div>

                            <div className="px-4 py-4 print:hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(expanded ? null : payment.id)
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                                {expanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-bold">
                                  Payment transactions
                                </h3>

                                <span className="text-xs text-slate-500">
                                  Verification: {payment.verification_status}
                                </span>
                              </div>

                              {transactions.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No payment transactions yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {transactions.map((transaction) => (
                                    <div
                                      key={transaction.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                                    >
                                      <div>
                                        <div className="font-semibold">
                                          {money(transaction.amount)} ·{" "}
                                          {transaction.payment_method ||
                                            "Unknown method"}
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                          <span>
                                            Reference:{" "}
                                            {transaction.reference_number ||
                                              "Not required"}
                                          </span>

                                          <span
                                            className={`rounded-full px-2 py-0.5 font-bold ${transactionStatusClass(
                                              transaction.transaction_status,
                                            )}`}
                                          >
                                            {transaction.transaction_status}
                                          </span>

                                          <span>
                                            {formatDateTime(
                                              transaction.created_at,
                                            )}
                                          </span>
                                        </div>

                                        {transaction.rejection_reason && (
                                          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                                            Reason:{" "}
                                            {transaction.rejection_reason}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2 print:hidden">
                                        {transaction.proof_of_payment && (
                                          <a
                                            href={transaction.proof_of_payment}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                          >
                                            View proof
                                          </a>
                                        )}

                                        {transaction.transaction_status ===
                                          "Pending" && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={
                                                processingId === transaction.id
                                              }
                                              onClick={() =>
                                                void approveTransaction(
                                                  transaction,
                                                )
                                              }
                                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                              Approve
                                            </button>

                                            <button
                                              type="button"
                                              disabled={
                                                processingId === transaction.id
                                              }
                                              onClick={() => {
                                                setRejectingTransaction(
                                                  transaction,
                                                );
                                                setRejectionReason("");
                                              }}
                                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                            >
                                              <XCircle className="h-4 w-4" />
                                              Reject
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredPayments.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700 print:hidden">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredPayments.length)} of{" "}
                {filteredPayments.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700"
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
          <FooterStat
            label="Total records"
            value={totals.totalRecords.toLocaleString()}
          />
          <FooterStat
            label="Pending verification"
            value={totals.pending.toLocaleString()}
          />
          <FooterStat label="Fully paid" value={totals.paid.toLocaleString()} />
          <FooterStat
            label="Filtered revenue"
            value={money(totals.totalPaid)}
          />
        </section>
      </div>

      {rejectingTransaction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 print:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-payment-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
          >
            <h2 id="reject-payment-title" className="text-lg font-bold">
              Reject payment transaction
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Provide a clear reason for the customer.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              className="mt-4 w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm outline-none transition focus:border-red-500 dark:border-slate-700"
              placeholder="Reason for rejection..."
            />

            <div className="mt-1 text-right text-xs text-slate-400">
              {rejectionReason.length}/500
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingTransaction(null);
                  setRejectionReason("");
                }}
                disabled={processingId === rejectingTransaction.id}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void submitRejection()}
                disabled={
                  processingId === rejectingTransaction.id ||
                  !rejectionReason.trim()
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === rejectingTransaction.id
                  ? "Rejecting..."
                  : "Reject transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 wrap-break-word text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </article>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
