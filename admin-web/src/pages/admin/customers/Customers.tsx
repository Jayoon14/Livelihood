import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Search,
  ShieldOff,
  UserCheck,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  CUSTOMER_STATUS,
  getCustomers,
  normalizeCustomerStatus,
  updateCustomerStatus,
  type Customer,
  type CustomerStatus,
} from "../../../services/customerService";

const PAGE_SIZE = 10;

type StatusFilter = "All" | CustomerStatus;

type DateFilter =
  | "All"
  | "Today"
  | "This Week"
  | "This Month"
  | "Custom";

type SortOption =
  | "Newest"
  | "Oldest"
  | "Name A-Z"
  | "Name Z-A"
  | "Status A-Z"
  | "Municipality A-Z";

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
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

function matchesDateFilter(
  createdAt: string | null,
  dateFilter: DateFilter,
  customStart: string,
  customEnd: string,
): boolean {
  if (dateFilter === "All") {
    return true;
  }

  if (!createdAt) {
    return false;
  }

  const date = new Date(createdAt);

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

  const start = customStart
    ? startOfDay(new Date(`${customStart}T00:00:00`))
    : null;
  const end = customEnd
    ? endOfDay(new Date(`${customEnd}T00:00:00`))
    : null;

  if (start && date < start) {
    return false;
  }

  if (end && date > end) {
    return false;
  }

  return true;
}

function statusClasses(status: string): string {
  const normalized = normalizeCustomerStatus(status);

  switch (normalized) {
    case CUSTOMER_STATUS.APPROVED:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

    case CUSTOMER_STATUS.PENDING:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case CUSTOMER_STATUS.DISABLED:
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";

    case CUSTOMER_STATUS.BLOCKED:
    case CUSTOMER_STATUS.REJECTED:
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortOption, setSortOption] =
    useState<SortOption>("Newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      setCustomers(await getCustomers());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load customers.";

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
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-customers-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "role=eq.customer",
        },
        () => {
          void loadCustomers(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    dateFilter,
    customStart,
    customEnd,
    sortOption,
  ]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "All" ||
        customer.normalized_status === statusFilter;

      const matchesDate = matchesDateFilter(
        customer.created_at,
        dateFilter,
        customStart,
        customEnd,
      );

      const searchable = [
        customer.full_name,
        customer.email,
        customer.phone,
        customer.full_address,
        customer.barangay,
        customer.municipality,
        customer.province,
        customer.normalized_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesDate &&
        (!term || searchable.includes(term))
      );
    });

    return [...filtered].sort((first, second) => {
      switch (sortOption) {
        case "Oldest":
          return (
            new Date(first.created_at ?? 0).getTime() -
            new Date(second.created_at ?? 0).getTime()
          );

        case "Name A-Z":
          return first.full_name.localeCompare(second.full_name);

        case "Name Z-A":
          return second.full_name.localeCompare(first.full_name);

        case "Status A-Z":
          return first.normalized_status.localeCompare(
            second.normalized_status,
          );

        case "Municipality A-Z":
          return String(first.municipality ?? "").localeCompare(
            String(second.municipality ?? ""),
          );

        case "Newest":
        default:
          return (
            new Date(second.created_at ?? 0).getTime() -
            new Date(first.created_at ?? 0).getTime()
          );
      }
    });
  }, [
    customers,
    customEnd,
    customStart,
    dateFilter,
    search,
    sortOption,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    return filteredCustomers.reduce(
      (result, customer) => {
        result.total += 1;

        switch (customer.normalized_status) {
          case CUSTOMER_STATUS.APPROVED:
            result.approved += 1;
            break;
          case CUSTOMER_STATUS.PENDING:
            result.pending += 1;
            break;
          case CUSTOMER_STATUS.DISABLED:
            result.disabled += 1;
            break;
          case CUSTOMER_STATUS.BLOCKED:
          case CUSTOMER_STATUS.REJECTED:
            result.blocked += 1;
            break;
        }

        const created = customer.created_at
          ? new Date(customer.created_at)
          : null;
        const now = new Date();

        if (
          created &&
          !Number.isNaN(created.getTime()) &&
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
        ) {
          result.newThisMonth += 1;
        }

        return result;
      },
      {
        total: 0,
        approved: 0,
        pending: 0,
        disabled: 0,
        blocked: 0,
        newThisMonth: 0,
      },
    );
  }, [filteredCustomers]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const pageCustomers = filteredCustomers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  async function changeStatus(
    customer: Customer,
    nextStatus: CustomerStatus,
  ) {
    const confirmed = await confirmAction(
      `Change ${customer.full_name}'s account status from ${customer.normalized_status} to ${nextStatus}?`,
      {
        title: "Update customer status",
        confirmText: nextStatus,
      },
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(customer.id);
    const toastId = toast.loading(
      "Updating customer status...",
    );

    try {
      const updated = await updateCustomerStatus(
        customer.id,
        nextStatus,
      );

      setCustomers((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      toast.success(
        `${customer.full_name} is now ${nextStatus}.`,
        { id: toastId },
      );
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update customer status.",
        { id: toastId },
      );
    } finally {
      setProcessingId(null);
    }
  }

  function exportCsv() {
    if (filteredCustomers.length === 0) {
      toast.warning("There are no customers to export.");
      return;
    }

    const headers = [
      "Customer ID",
      "Full Name",
      "Email",
      "Phone",
      "Gender",
      "Birth Date",
      "Address",
      "Barangay",
      "Municipality",
      "Province",
      "Status",
      "Registered At",
    ];

    const rows = filteredCustomers.map((customer) => [
      customer.id,
      customer.full_name,
      customer.email ?? "",
      customer.phone ?? "",
      customer.gender ?? "",
      customer.birth_date ?? "",
      customer.full_address,
      customer.barangay ?? "",
      customer.municipality ?? "",
      customer.province ?? "",
      customer.normalized_status,
      customer.created_at ?? "",
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

    anchor.href = url;
    anchor.download = `customers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    toast.success("Customers CSV exported.");
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
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
              Customers Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review customer accounts, profiles, and account status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Print / PDF
            </button>

            <button
              type="button"
              onClick={() => void loadCustomers(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            title="Total"
            value={summary.total}
            icon={<Users className="h-5 w-5" />}
          />
          <SummaryCard
            title="Approved"
            value={summary.approved}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <SummaryCard
            title="Disabled"
            value={summary.disabled}
            icon={<ShieldOff className="h-5 w-5" />}
          />
          <SummaryCard
            title="Blocked / Rejected"
            value={summary.blocked}
            icon={<Ban className="h-5 w-5" />}
          />
          <SummaryCard
            title="New This Month"
            value={summary.newThisMonth}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.5fr_180px_180px_190px_auto] dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, email, phone, address, or status..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="All">All statuses</option>
            {Object.values(CUSTOMER_STATUS).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value as DateFilter,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
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
              setSortOption(
                event.target.value as SortOption,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Name A-Z</option>
            <option>Name Z-A</option>
            <option>Status A-Z</option>
            <option>Municipality A-Z</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Reset
          </button>

          {dateFilter === "Custom" && (
            <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 xl:col-span-5">
              <input
                type="date"
                value={customStart}
                onChange={(event) =>
                  setCustomStart(event.target.value)
                }
                max={customEnd || undefined}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950"
              />

              <input
                type="date"
                value={customEnd}
                onChange={(event) =>
                  setCustomEnd(event.target.value)
                }
                min={customStart || undefined}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          )}
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            Loading customers...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : pageCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Users className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
              No customers found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Change the search term or filters.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-275">
                <thead className="bg-slate-50 text-left text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Contact</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Joined</th>
                    <th className="p-4 font-semibold print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageCustomers.map((customer) => {
                    const isProcessing =
                      processingId === customer.id;

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {customer.avatar ? (
                              <img
                                src={customer.avatar}
                                alt={customer.full_name}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                {customer.full_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <Link
                                to={`/customers/${customer.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline dark:text-white"
                              >
                                {customer.full_name}
                              </Link>
                              <p className="max-w-64 truncate text-xs text-slate-500">
                                ID: {customer.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          <p>{customer.email || "No email"}</p>
                          <p className="text-xs text-slate-500">
                            {customer.phone || "No phone"}
                          </p>
                        </td>

                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          <p>
                            {customer.municipality ||
                              "No municipality"}
                          </p>
                          <p className="max-w-64 truncate text-xs text-slate-500">
                            {customer.full_address ||
                              "No address"}
                          </p>
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              customer.normalized_status,
                            )}`}
                          >
                            {customer.normalized_status}
                          </span>
                        </td>

                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(customer.created_at)}
                        </td>

                        <td className="p-4 print:hidden">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              View details
                            </Link>

                            {customer.normalized_status !==
                              CUSTOMER_STATUS.APPROVED && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void changeStatus(
                                    customer,
                                    CUSTOMER_STATUS.APPROVED,
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Activate
                              </button>
                            )}

                            {customer.normalized_status !==
                              CUSTOMER_STATUS.DISABLED && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void changeStatus(
                                    customer,
                                    CUSTOMER_STATUS.DISABLED,
                                  )
                                }
                                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                Disable
                              </button>
                            )}

                            {customer.normalized_status !==
                              CUSTOMER_STATUS.BLOCKED && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void changeStatus(
                                    customer,
                                    CUSTOMER_STATUS.BLOCKED,
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Block
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 print:hidden">
              <p className="text-sm text-slate-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(
                  safePage * PAGE_SIZE,
                  filteredCustomers.length,
                )}{" "}
                of {filteredCustomers.length}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                >
                  Previous
                </button>

                <span className="flex items-center px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>
  );
}