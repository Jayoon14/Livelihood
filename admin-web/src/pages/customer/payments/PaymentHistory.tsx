import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  PhilippinePeso,
  ReceiptText,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import { getCustomerPayments } from "../../../services/paymentService";

/* ==========================
   TYPES
========================== */

type PaymentStatus = "Paid" | "Pending" | "Failed" | "Rejected" | string;

type PaymentItem = {
  id: number;
  booking_id: number;

  amount: number | string;

  total_amount?: number;
  amount_paid?: number;
  balance?: number;

  pending_amount?: number;
  submitted_amount?: number;
  display_balance?: number;

  payment_method: string | null;
  payment_status: PaymentStatus;

  created_at?: string | null;

  worker?: {
    first_name?: string | null;
    last_name?: string | null;
    profile_picture?: string | null;
  } | null;

  booking?: {
    booking_date?: string | null;
    booking_time?: string | null;
    address?: string | null;

    services?: {
      service_name?: string | null;
    } | null;
  } | null;
};

type FilterType = "All" | "Paid" | "Pending" | "Failed";

/* ==========================
   FILTER OPTIONS
========================== */

const filterOptions: FilterType[] = ["All", "Paid", "Pending", "Failed"];

/* ==========================
   COMPONENT
========================== */

export default function PaymentHistory() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");

  const [errorMessage, setErrorMessage] = useState("");

  /* ==========================
     LOAD PAYMENTS
  ========================== */

  useEffect(() => {
    void loadPayments();
  }, []);

  async function loadPayments(isRefresh = false) {
    try {
      setErrorMessage("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setPayments([]);
        setErrorMessage("You must be signed in to view your payment history.");

        return;
      }

      const data = await getCustomerPayments(user.id);

      setPayments(Array.isArray(data) ? (data as PaymentItem[]) : []);
    } catch (error) {
      console.error("Load customer payments error:", error);

      setErrorMessage("Unable to load your payment history. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* ==========================
     FORMATTERS
  ========================== */

  function formatCurrency(amount: number | string) {
    const numericAmount = Number(amount) || 0;

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(numericAmount);
  }

  function formatDate(dateValue?: string | null) {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getWorkerName(payment: PaymentItem) {
    const firstName = payment.worker?.first_name?.trim() ?? "";

    const lastName = payment.worker?.last_name?.trim() ?? "";

    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Worker unavailable";
  }
  function getWorkerProfileImage(payment: PaymentItem) {
    return payment.worker?.profile_picture?.trim() || null;
  }
  function getServiceName(payment: PaymentItem) {
    return (
      payment.booking?.services?.service_name?.trim() || "Service unavailable"
    );
  }
  function normalizeStatus(status?: string | null) {
    return status?.trim().toLowerCase() ?? "";
  }

  /* ==========================
     SUMMARY
  ========================== */

  const totalAmount = useMemo(() => {
    return payments.reduce((total, payment) => {
      return total + (Number(payment.amount) || 0);
    }, 0);
  }, [payments]);

  const paidPayments = useMemo(() => {
    return payments.filter(
      (payment) => normalizeStatus(payment.payment_status) === "paid",
    );
  }, [payments]);

  const pendingPayments = useMemo(() => {
    return payments.filter(
      (payment) => normalizeStatus(payment.payment_status) === "pending",
    );
  }, [payments]);

  const failedPayments = useMemo(() => {
    return payments.filter((payment) => {
      const status = normalizeStatus(payment.payment_status);

      return status === "failed" || status === "rejected";
    });
  }, [payments]);

  const receiptsAvailable = paidPayments.length;

  /* ==========================
     FILTER PAYMENTS
  ========================== */

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return payments.filter((payment) => {
      const workerName = getWorkerName(payment).toLowerCase();

      const serviceName = getServiceName(payment).toLowerCase();

      const paymentMethod = payment.payment_method?.toLowerCase().trim() ?? "";

      const paymentStatus = normalizeStatus(payment.payment_status);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        workerName.includes(normalizedSearch) ||
        serviceName.includes(normalizedSearch) ||
        paymentMethod.includes(normalizedSearch) ||
        paymentStatus.includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      switch (selectedFilter) {
        case "Paid":
          return paymentStatus === "paid";

        case "Pending":
          return paymentStatus === "pending";

        case "Failed":
          return paymentStatus === "failed" || paymentStatus === "rejected";

        case "All":
        default:
          return true;
      }
    });
  }, [payments, searchText, selectedFilter]);

  /* ==========================
     FILTER COUNTS
  ========================== */

  function getFilterCount(filter: FilterType) {
    switch (filter) {
      case "Paid":
        return paidPayments.length;

      case "Pending":
        return pendingPayments.length;

      case "Failed":
        return failedPayments.length;

      case "All":
      default:
        return payments.length;
    }
  }

  /* ==========================
     STATUS STYLES
  ========================== */

      function getStatusStyle(payment: PaymentItem) {
  if ((payment.display_balance ?? payment.balance ?? 0) === 0) {
    return {
      icon: CheckCircle2,
      label: "Paid",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if ((payment.amount_paid ?? 0) > 0) {
    return {
      icon: Clock3,
      label: "Partially Paid",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    icon: Clock3,
    label: "Pending",
    className: "border-red-200 bg-red-50 text-red-700",
  };
}

  /* ==========================
     RECEIPT NAVIGATION
  ========================== */

  function handleViewReceipt(payment: PaymentItem) {
    navigate(`/customer/receipt/${payment.booking_id}`);
  }

  /* ==========================
     UI
  ========================== */

  return (
    <CustomerLayout>
      <div className="min-h-full bg-gray-50/80 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1700px] space-y-6">
          {/* HEADER */}

          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  text-gray-600
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-x-0.5
                  hover:border-gray-300
                  hover:bg-gray-50
                  hover:text-gray-900
                  hover:shadow
                "
                aria-label="Go back"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm sm:flex">
                    <CreditCard size={22} />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                      Payment History
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                      Track your payments, transaction statuses, and available
                      receipts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadPayments(true);
              }}
              disabled={refreshing}
              className="
                flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-medium
                text-gray-700
                shadow-sm
                transition-all
                hover:-translate-y-0.5
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-700
                hover:shadow
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* SUMMARY CARDS */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Payment Amount"
              value={formatCurrency(totalAmount)}
              description={`${payments.length} total transaction${
                payments.length === 1 ? "" : "s"
              }`}
              icon={PhilippinePeso}
              iconClassName="bg-blue-100 text-blue-600"
            />

            <SummaryCard
              title="Paid Transactions"
              value={paidPayments.length.toString()}
              description="Successfully completed"
              icon={CheckCircle2}
              iconClassName="bg-emerald-100 text-emerald-600"
            />

            <SummaryCard
              title="Pending Payments"
              value={pendingPayments.length.toString()}
              description="Awaiting confirmation"
              icon={Clock3}
              iconClassName="bg-amber-100 text-amber-600"
            />

            <SummaryCard
              title="Available Receipts"
              value={receiptsAvailable.toString()}
              description="Ready to view"
              icon={ReceiptText}
              iconClassName="bg-violet-100 text-violet-600"
            />
          </div>

          {/* SEARCH AND FILTERS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search
                  size={19}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by worker, service, method, or status..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-11
                    pr-4
                    text-sm
                    text-gray-800
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {filterOptions.map((filter) => {
                  const active = selectedFilter === filter;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSelectedFilter(filter)}
                      className={`
                          flex
                          shrink-0
                          items-center
                          gap-2
                          rounded-full
                          border
                          px-4
                          py-2
                          text-sm
                          font-medium
                          transition
                          ${
                            active
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }
                        `}
                    >
                      {filter}

                      <span
                        className={`
                            rounded-full
                            px-2
                            py-0.5
                            text-xs
                            ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500"
                            }
                          `}
                      >
                        {getFilterCount(filter)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700">
              <XCircle size={20} className="mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="text-sm font-medium">{errorMessage}</p>

                <button
                  type="button"
                  onClick={() => {
                    void loadPayments();
                  }}
                  className="mt-2 text-sm font-semibold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT CONTENT */}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <LoadingState />
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                hasPayments={payments.length > 0}
                searchText={searchText}
                selectedFilter={selectedFilter}
                onReset={() => {
                  setSearchText("");
                  setSelectedFilter("All");
                }}
              />
            ) : (
              <>
                {/* DESKTOP TABLE */}

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[950px]">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <TableHeader>Worker</TableHeader>

                        <TableHeader>Service</TableHeader>

                        <TableHeader>Total</TableHeader>

                        <TableHeader>Submitted</TableHeader>

                        <TableHeader>Balance</TableHeader>

                        <TableHeader>Status</TableHeader>

                        <TableHeader align="right">Action</TableHeader>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredPayments.map((payment) => {
                        const status = getStatusStyle(payment);

                        const StatusIcon = status.icon;
                        return (
                          <tr
                            key={payment.id}
                            className="group transition hover:bg-blue-50/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-600 ring-2 ring-white">
                                  {getWorkerProfileImage(payment) ? (
                                    <img
                                      src={getWorkerProfileImage(payment) ?? ""}
                                      alt={`${getWorkerName(payment)} profile`}
                                      className="h-full w-full object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />
                                  ) : (
                                    <UserRound size={19} />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {getWorkerName(payment)}
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-400">
                                    Worker
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="max-w-[220px] truncate text-sm font-medium text-gray-700">
                                {getServiceName(payment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                                <p className="font-bold">
                                    {formatCurrency(payment.total_amount ?? payment.amount)}
                                </p>
                            </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-emerald-600">
                              {formatCurrency(
                                payment.submitted_amount ?? payment.amount_paid ?? 0,
                              )}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p
                              className={
                                (payment.display_balance ?? payment.balance ?? 0) > 0
                                  ? "font-bold text-red-600"
                                  : "font-bold text-emerald-600"
                              }
                            >
                              {formatCurrency(payment.display_balance ?? payment.balance ?? 0)}
                            </p>
                          </td>

                            <td className="px-5 py-4">
                              <span
                                className={`
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-full
                                    border
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-semibold
                                    ${status.className}
                                  `}
                              >
                                <StatusIcon size={14} />

                                {status.label}
                              </span>
                            </td>

                          <td className="px-5 py-4 text-right">
                            {(payment.display_balance ?? payment.balance ?? 0) > 0 ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/customer/payment/${payment.booking_id}`)}
                                className="
                                  inline-flex
                                  items-center
                                  justify-center
                                  gap-2
                                  rounded-xl
                                  bg-blue-600
                                  px-4
                                  py-2
                                  text-sm
                                  font-medium
                                  text-white
                                  shadow-sm
                                  transition-all
                                  hover:-translate-y-0.5
                                  hover:bg-blue-700
                                  hover:shadow
                                "
                              >
                                <CreditCard size={16} />
                                Continue Payment
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(payment)}
                                className="
                                  inline-flex
                                  items-center
                                  justify-center
                                  gap-2
                                  rounded-xl
                                  bg-emerald-600
                                  px-4
                                  py-2
                                  text-sm
                                  font-medium
                                  text-white
                                  shadow-sm
                                  transition-all
                                  hover:-translate-y-0.5
                                  hover:bg-emerald-700
                                  hover:shadow
                                "
                              >
                                <FileText size={16} />
                                Receipt
                              </button>
                            )}
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS */}

                <div className="divide-y divide-gray-100 lg:hidden">
                  {filteredPayments.map((payment) => {
                    const status = getStatusStyle(payment);

                    const StatusIcon = status.icon;

                    const isPaid =
                      normalizeStatus(payment.payment_status) === "paid";

                    return (
                      <article
                        key={payment.id}
                        className="p-4 transition hover:bg-gray-50 sm:p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-100 text-blue-600">
                            {getWorkerProfileImage(payment) ? (
                              <img
                                src={getWorkerProfileImage(payment) ?? ""}
                                alt={`${getWorkerName(payment)} profile`}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <UserRound size={20} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h2 className="font-semibold text-gray-900">
                                  {getWorkerName(payment)}
                                </h2>

                                <p className="mt-0.5 text-sm text-gray-500">
                                  {getServiceName(payment)}
                                </p>
                              </div>

                              <span
                                className={`
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-full
                                    border
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-semibold
                                    ${status.className}
                                  `}
                              >
                                <StatusIcon size={13} />

                                {status.label}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <MobileDetail
                                label="Amount"
                                value={formatCurrency(payment.amount)}
                              />

                              <MobileDetail
                                label="Method"
                                value={
                                  payment.payment_method || "Not specified"
                                }
                              />

                              <MobileDetail
                                label="Date"
                                value={formatDate(payment.created_at)}
                              />

                              <MobileDetail
                                label="Transaction"
                                value={`#${payment.id}`}
                              />
                            </div>

                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(payment)}
                                className="
                                    mt-4
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-blue-600
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-medium
                                    text-white
                                    shadow-sm
                                    transition
                                    hover:bg-blue-700
                                  "
                              >
                                <ReceiptText size={17} />
                                View Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* FOOTER */}

                <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/80 px-5 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing{" "}
                    <strong className="font-semibold text-gray-700">
                      {filteredPayments.length}
                    </strong>{" "}
                    of{" "}
                    <strong className="font-semibold text-gray-700">
                      {payments.length}
                    </strong>{" "}
                    payments
                  </span>

                  <span>
                    Total displayed:{" "}
                    <strong className="font-semibold text-gray-700">
                      {formatCurrency(
                        filteredPayments.reduce(
                          (total, payment) =>
                            total + (Number(payment.amount) || 0),
                          0,
                        ),
                      )}
                    </strong>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

/* ==========================
   SUMMARY CARD
========================== */

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: typeof CreditCard;
  iconClassName: string;
};

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

/* ==========================
   TABLE HEADER
========================== */

type TableHeaderProps = {
  children: React.ReactNode;
  align?: "left" | "right";
};

function TableHeader({ children, align = "left" }: TableHeaderProps) {
  return (
    <th
      className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/* ==========================
   MOBILE DETAIL
========================== */

type MobileDetailProps = {
  label: string;
  value: string;
};

function MobileDetail({ label, value }: MobileDetailProps) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <p className="text-xs font-medium text-gray-400">{label}</p>

      <p className="mt-1 truncate text-sm font-semibold text-gray-700">
        {value}
      </p>
    </div>
  );
}

/* ==========================
   LOADING STATE
========================== */

function LoadingState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

      <p className="mt-4 font-medium text-gray-700">
        Loading payment history...
      </p>

      <p className="mt-1 text-sm text-gray-400">
        Please wait while we retrieve your transactions.
      </p>
    </div>
  );
}

/* ==========================
   EMPTY STATE
========================== */

type EmptyStateProps = {
  hasPayments: boolean;
  searchText: string;
  selectedFilter: FilterType;
  onReset: () => void;
};

function EmptyState({
  hasPayments,
  searchText,
  selectedFilter,
  onReset,
}: EmptyStateProps) {
  const hasActiveFilter =
    searchText.trim().length > 0 || selectedFilter !== "All";

  return (
    <div className="flex min-h-96 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <CreditCard size={34} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-gray-900">
        {hasPayments && hasActiveFilter
          ? "No matching payments"
          : "No payment history yet"}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasPayments && hasActiveFilter
          ? "No transactions match your current search or status filter."
          : "Once you complete your first payment, your transaction details and receipts will appear here."}
      </p>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Clear Search and Filters
        </button>
      )}
    </div>
  );
}
