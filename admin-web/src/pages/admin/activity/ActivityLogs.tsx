import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  deleteActivityLog,
  deleteAllActivityLogs,
  exportFilteredActivityLogsCsv,
  getActivityLogFilterOptions,
  getActivityLogPage,
  getActivityLogSummary,
  getActivityUserName,
  type ActivityLog,
  type ActivityLogSummary,
  type ActivityLogWithUser,
} from "../../../services/activityService";

const PAGE_SIZE = 10;

type DatePreset =
  | "all"
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "custom";

const EMPTY_SUMMARY: ActivityLogSummary = {
  total: 0,
  today: 0,
  approvals: 0,
  destructive: 0,
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function resolveDateRange(preset: DatePreset): {
  from: string;
  to: string;
} {
  const now = new Date();
  const today = formatDateInput(now);

  if (preset === "today") {
    return {
      from: today,
      to: today,
    };
  }

  if (preset === "7days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);

    return {
      from: formatDateInput(from),
      to: today,
    };
  }

  if (preset === "30days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);

    return {
      from: formatDateInput(from),
      to: today,
    };
  }

  if (preset === "month") {
    const from = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    return {
      from: formatDateInput(from),
      to: today,
    };
  }

  return {
    from: "",
    to: "",
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function actionClass(action: string): string {
  const normalized = action
    .trim()
    .toUpperCase();

  if (normalized.includes("APPROV")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (
    normalized.includes("REJECT") ||
    normalized.includes("DELETE") ||
    normalized.includes("CANCEL")
  ) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (
    normalized.includes("LOGIN") ||
    normalized.includes("CREATE")
  ) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }

  if (
    normalized.includes("REGISTER") ||
    normalized.includes("UPDATE")
  ) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
  }

  if (normalized.includes("LOGOUT")) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<
    ActivityLogWithUser[]
  >([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");
  const [moduleFilter, setModuleFilter] =
    useState("All");
  const [actionFilter, setActionFilter] =
    useState("All");
  const [datePreset, setDatePreset] =
    useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [moduleOptions, setModuleOptions] =
    useState<string[]>([]);
  const [actionOptions, setActionOptions] =
    useState<string[]>([]);
  const [summary, setSummary] =
    useState<ActivityLogSummary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] =
    useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] =
    useState<number | null>(null);
  const [deletingAll, setDeletingAll] =
    useState(false);
  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (datePreset === "custom") {
      return;
    }

    const range = resolveDateRange(datePreset);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPage(1);
  }, [datePreset]);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, actionFilter]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      module:
        moduleFilter === "All"
          ? undefined
          : moduleFilter,
      action:
        actionFilter === "All"
          ? undefined
          : actionFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [
      actionFilter,
      dateFrom,
      dateTo,
      debouncedSearch,
      moduleFilter,
      page,
    ],
  );

  const loadLogs = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result =
          await getActivityLogPage(query);

        setLogs(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load activity logs.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query],
  );

  const loadMeta = useCallback(async () => {
    try {
      const [options, counts] =
        await Promise.all([
          getActivityLogFilterOptions(),
          getActivityLogSummary(),
        ]);

      setModuleOptions(options.modules);
      setActionOptions(options.actions);
      setSummary(counts);
    } catch (caught) {
      console.error(
        "Load activity log metadata error:",
        caught,
      );
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let active = true;

    async function initializeRealtime() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || !active) {
        return;
      }

      channel = supabase
        .channel("admin-activity-logs")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_logs",
          },
          (
            _payload: RealtimePostgresChangesPayload<ActivityLog>,
          ) => {
            void loadLogs(true);
            void loadMeta();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "activity_logs",
          },
          () => {
            void loadLogs(true);
            void loadMeta();
          },
        )
        .subscribe();
    }

    void initializeRealtime();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadLogs, loadMeta]);

  async function exportCsv() {
    setExporting(true);

    try {
      const exported =
        await exportFilteredActivityLogsCsv({
          search:
            debouncedSearch || undefined,
          module:
            moduleFilter === "All"
              ? undefined
              : moduleFilter,
          action:
            actionFilter === "All"
              ? undefined
              : actionFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });

      toast.success(
        `${exported} activity log${
          exported === 1 ? "" : "s"
        } exported.`,
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to export activity logs.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(
    log: ActivityLogWithUser,
  ) {
    const confirmed = window.confirm(
      `Delete this activity log?\n\n${log.action} — ${log.description}`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(log.id);

    try {
      await deleteActivityLog(log.id);

      toast.success("Activity log deleted.");

      if (logs.length === 1 && page > 1) {
        setPage((current) =>
          Math.max(1, current - 1),
        );
      } else {
        await loadLogs(true);
      }

      await loadMeta();
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to delete activity log.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    if (summary.total === 0) {
      toast.error(
        "There are no activity logs to delete.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete all ${summary.total} activity logs?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const confirmationText =
      window.prompt(
        'Type DELETE ALL to permanently remove every activity log.',
      ) ?? "";

    if (
      confirmationText.trim().toUpperCase() !==
      "DELETE ALL"
    ) {
      toast.info("Delete all was cancelled.");
      return;
    }

    setDeletingAll(true);

    try {
      const deleted =
        await deleteAllActivityLogs();

      setLogs([]);
      setPage(1);
      setTotal(0);
      setTotalPages(1);
      setSummary(EMPTY_SUMMARY);

      toast.success(
        `${deleted} activity log${
          deleted === 1 ? "" : "s"
        } deleted.`,
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to delete all activity logs.",
      );
    } finally {
      setDeletingAll(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setModuleFilter("All");
    setActionFilter("All");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasFilters =
    Boolean(search.trim()) ||
    moduleFilter !== "All" ||
    actionFilter !== "All" ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const showingFrom =
    total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(
    page * PAGE_SIZE,
    total,
  );

  return (
    <AdminLayout>
      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Activity Logs
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review important system and account
              activities.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={
                loading ||
                exporting ||
                total === 0
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              {exporting
                ? "Exporting..."
                : "Export CSV"}
            </button>

            <button
              type="button"
              onClick={() =>
                void handleDeleteAll()
              }
              disabled={
                loading ||
                deletingAll ||
                summary.total === 0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deletingAll
                ? "Deleting all..."
                : "Delete All"}
            </button>

            <button
              type="button"
              onClick={() => {
                void loadLogs(true);
                void loadMeta();
              }}
              disabled={refreshing || deletingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total logs"
            value={summary.total}
            icon={FileClock}
          />
          <SummaryCard
            label="Today"
            value={summary.today}
            icon={CalendarDays}
          />
          <SummaryCard
            label="Approvals"
            value={summary.approvals}
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Critical actions"
            value={summary.destructive}
            icon={ShieldAlert}
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search action, module, description, or user ID..."
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <select
              value={moduleFilter}
              onChange={(event) =>
                setModuleFilter(
                  event.target.value,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="All">
                All modules
              </option>

              {moduleOptions.map((module) => (
                <option
                  key={module}
                  value={module}
                >
                  {module}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(
                  event.target.value,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="All">
                All actions
              </option>

              {actionOptions.map((action) => (
                <option
                  key={action}
                  value={action}
                >
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-[200px_1fr_1fr_auto]">
            <select
              value={datePreset}
              onChange={(event) =>
                setDatePreset(
                  event.target
                    .value as DatePreset,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="all">
                All dates
              </option>
              <option value="today">
                Today
              </option>
              <option value="7days">
                Last 7 days
              </option>
              <option value="30days">
                Last 30 days
              </option>
              <option value="month">
                This month
              </option>
              <option value="custom">
                Custom range
              </option>
            </select>

            <input
              type="date"
              value={dateFrom}
              disabled={datePreset !== "custom"}
              onChange={(event) => {
                setDateFrom(
                  event.target.value,
                );
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            />

            <input
              type="date"
              value={dateTo}
              disabled={datePreset !== "custom"}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(
                  event.target.value,
                );
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            />

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear filters
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadLogs()
              }
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-250 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3">
                      User
                    </th>
                    <th className="px-4 py-3">
                      Module
                    </th>
                    <th className="px-4 py-3">
                      Action
                    </th>
                    <th className="px-4 py-3">
                      Description
                    </th>
                    <th className="px-4 py-3">
                      Time
                    </th>
                    <th className="px-4 py-3 text-right">
                      Manage
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        Loading activity logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No activity found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {getActivityUserName(
                              log,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {log.user?.email ||
                              log.user_id}
                          </p>

                          {log.user?.role && (
                            <p className="mt-1 text-xs capitalize text-slate-400">
                              {log.user.role}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {log.module ||
                            "Unknown"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${actionClass(
                              log.action,
                            )}`}
                          >
                            {log.action ||
                              "UNKNOWN"}
                          </span>
                        </td>

                        <td className="max-w-120 px-4 py-4 text-slate-600 dark:text-slate-300">
                          <p className="wrap-break-word">
                            {log.description ||
                              "No description"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                          {formatDateTime(
                            log.created_at,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              void handleDelete(
                                log,
                              )
                            }
                            disabled={
                              deletingId ===
                                log.id ||
                              deletingAll
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId ===
                            log.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <p className="text-slate-500">
                Showing {showingFrom}–
                {showingTo} of {total}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                    )
                  }
                  disabled={
                    page === 1 || loading
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="font-medium">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                    )
                  }
                  disabled={
                    page >= totalPages ||
                    loading
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        )}
      </section>
    </AdminLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FileClock;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <Icon className="h-5 w-5 text-blue-600" />
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>
  );
}