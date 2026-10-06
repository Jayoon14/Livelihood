import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  DEFAULT_ACTIVITY_MODULES,
  DEFAULT_ACTIVITY_ACTIONS,
  exportFilteredActivityLogsCsv,
  getActivityLogFilterOptions,
  getActivityLogPage,
  getActivityLogSummary,
  getActivityLogUserOptions,
  getActivityProfileName,
  getActivityUserName,
  type ActivityLogSummary,
  type ActivityLogWithUser,
  type ActivityUser,
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

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

function todayPH(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function dateRange(preset: DatePreset) {
  if (preset === "all" || preset === "custom") {
    return { from: "", to: "" };
  }

  const today = todayPH();
  const start = new Date(`${today}T00:00:00Z`);

  if (preset === "7days") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (preset === "30days") {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (preset === "month") {
    start.setUTCDate(1);
  }

  return {
    from: start.toISOString().slice(0, 10),
    to: today,
  };
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load activity logs.";
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogWithUser[]>([]);
  const [summary, setSummary] =
    useState<ActivityLogSummary>(EMPTY_SUMMARY);

  const [modules, setModules] = useState<string[]>(DEFAULT_ACTIVITY_MODULES);
  const [actions, setActions] = useState<string[]>(DEFAULT_ACTIVITY_ACTIONS);
  const [users, setUsers] = useState<ActivityUser[]>([]);

  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All");
  const [crudFilter, setCrudFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");

  const [preset, setPreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [metadataError, setMetadataError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  function resetPage() {
    setPage(1);
    setPageInput("1");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchApplied(search.trim());
      setPage(1);
      setPageInput("1");
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: searchApplied || undefined,
      crud: crudFilter === "All" ? undefined : crudFilter,
      outcome: outcomeFilter === "All" ? undefined : outcomeFilter,
      module: moduleFilter === "All" ? undefined : moduleFilter,
      action: actionFilter === "All" ? undefined : actionFilter,
      role: roleFilter === "All" ? undefined : roleFilter,
      userId: userFilter === "All" ? undefined : userFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [
      searchApplied,
      crudFilter,
      outcomeFilter,
      moduleFilter,
      actionFilter,
      roleFilter,
      userFilter,
      dateFrom,
      dateTo,
    ],
  );

  const invalidDates = Boolean(
    dateFrom && dateTo && dateFrom > dateTo,
  );

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      if (invalidDates) {
        setError("Start date must not be later than end date.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      void getActivityLogPage({
        ...filters,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((result) => {
          if (!active) return;

          if (page > result.totalPages) {
            setPage(result.totalPages);
            setPageInput(String(result.totalPages));
            return;
          }

          setLogs(result.items);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        })
        .catch((caught: unknown) => {
          if (active) setError(getError(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filters, page, refreshKey, invalidDates]);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        getActivityLogFilterOptions(),
        getActivityLogSummary(),
        getActivityLogUserOptions(),
      ]).then(([options, counts, profiles]) => {
        if (!active) return;
        const failures: string[] = [];
        if (options.status === "fulfilled") {
          setModules(options.value.modules);
          setActions(options.value.actions);
        } else failures.push("Module/action filters: " + getError(options.reason));
        if (counts.status === "fulfilled") setSummary(counts.value);
        else failures.push("Summary: " + getError(counts.reason));
        if (profiles.status === "fulfilled") setUsers(profiles.value);
        else failures.push("User filters: " + getError(profiles.reason));
        setMetadataError(failures.join(" • "));
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refreshKey]);

  useEffect(() => {
    let timer: number | undefined;

    const channel = supabase
      .channel("admin-activity-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(refresh, 500);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  async function exportCsv() {
    setExporting(true);

    try {
      const count = await exportFilteredActivityLogsCsv(filters);
      toast.success(`${count} activity logs exported.`);
    } catch (caught) {
      toast.error(getError(caught));
    } finally {
      setExporting(false);
    }
  }

  function changePreset(value: DatePreset) {
    setPreset(value);

    if (value !== "custom") {
      const range = dateRange(value);
      setDateFrom(range.from);
      setDateTo(range.to);
    }

    resetPage();
  }

  function changePage(value: number) {
    const next = Math.min(totalPages, Math.max(1, value));
    setPage(next);
    setPageInput(String(next));
  }

  function applyPage() {
    const value = Number(pageInput);

    if (!Number.isSafeInteger(value) || value < 1) {
      setPageInput(String(page));
      return;
    }

    changePage(value);
  }

  function clearFilters() {
    setSearch("");
    setSearchApplied("");
    setModuleFilter("All");
    setActionFilter("All");
    setRoleFilter("All");
    setUserFilter("All");
    setCrudFilter("All");
    setOutcomeFilter("All");
    setPreset("all");
    setDateFrom("");
    setDateTo("");
    resetPage();
  }

  const filteredUsers = users.filter(
    (user) =>
      roleFilter === "All" ||
      user.role?.trim().toLowerCase() === roleFilter,
  );

  const cards = [
    { label: "Total logs", value: summary.total },
    { label: "Today", value: summary.today },
    { label: "Approvals", value: summary.approvals },
    { label: "Critical actions", value: summary.destructive },
  ];

  return (
    <AdminLayout>
      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Activity Logs
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review recorded activities. Times use Philippine time.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={
                loading ||
                exporting ||
                total === 0 ||
                invalidDates ||
                Boolean(error) ||
                search.trim() !== searchApplied
              }
              className={BUTTON}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className={BUTTON}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
            </article>
          ))}
        </div>

        {metadataError && (
          <p
            role="alert"
            className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          >
            Filters or summary could not be refreshed: {metadataError}
          </p>
        )}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="relative">
              <span className="sr-only">Search logs</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search action, module, description, or full user ID"
                className={`${INPUT} pl-10`}
              />
            </label>

            <select
              aria-label="Module"
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value);
                resetPage();
              }}
              className={INPUT}
            >
              <option value="All">All modules</option>
              {modules.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              aria-label="Action"
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                resetPage();
              }}
              className={INPUT}
            >
              <option value="All">All actions</option>
              {actions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Role at event"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setUserFilter("All");
                resetPage();
              }}
              className={INPUT}
            >
              <option value="All">All roles</option>
              <option value="admin">Admin</option>
              <option value="worker">Worker</option>
              <option value="customer">Customer</option>
              <option value="system">System</option>
              <option value="unknown">Unknown</option>
              <option value="anonymous">Anonymous</option>
            </select>

            <select
              aria-label="User"
              value={userFilter}
              onChange={(event) => {
                setUserFilter(event.target.value);
                resetPage();
              }}
              className={INPUT}
            >
              <option value="All">All users</option>
              {filteredUsers
                .filter((user) => Boolean(user.id))
                .map((user) => (
                  <option key={user.id} value={user.id ?? ""}>
                    {getActivityProfileName(user)}
                    {user.email ? ` — ${user.email}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="CRUD operation" value={crudFilter} onChange={(event) => { setCrudFilter(event.target.value); resetPage(); }} className={INPUT}>
              <option value="All">All CRUD operations</option>
              {["CREATE", "READ", "UPDATE", "DELETE", "OTHER"].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <select aria-label="Result" value={outcomeFilter} onChange={(event) => { setOutcomeFilter(event.target.value); resetPage(); }} className={INPUT}>
              <option value="All">All results</option>
              {["SUCCESS", "FAILED", "PENDING", "SKIPPED"].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <select
              aria-label="Date range"
              value={preset}
              onChange={(event) =>
                changePreset(event.target.value as DatePreset)
              }
              className={INPUT}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>

            <input
              aria-label="Start date"
              type="date"
              value={dateFrom}
              disabled={preset !== "custom"}
              max={dateTo || undefined}
              onChange={(event) => {
                setDateFrom(event.target.value);
                resetPage();
              }}
              className={INPUT}
            />

            <input
              aria-label="End date"
              type="date"
              value={dateTo}
              disabled={preset !== "custom"}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value);
                resetPage();
              }}
              className={INPUT}
            />

            <button
              type="button"
              onClick={clearFilters}
              className={BUTTON}
            >
              Clear filters
            </button>
          </div>
        </section>

        {error ? (
          <section
            role="alert"
            className="rounded-xl bg-red-50 p-5 text-center text-red-700 dark:bg-red-950/20 dark:text-red-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              disabled={invalidDates}
              className={`${BUTTON} mt-3`}
            >
              Try again
            </button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm text-slate-500" aria-live="polite">
                {loading
                  ? "Loading activity logs..."
                  : total === 0
                    ? "Showing 0 of 0"
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1 || loading}
                  className={BUTTON}
                >
                  Previous
                </button>

                <input
                  aria-label="Page number"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  disabled={loading}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={applyPage}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    } else if (event.key === "Escape") {
                      setPageInput(String(page));
                    }
                  }}
                  className={`${INPUT} w-16 text-center`}
                />

                <span className="text-sm text-slate-500">
                  / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={page >= totalPages || loading}
                  className={BUTTON}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
                  <tr>
                    {[
                      "User",
                      "Role at event",
                      "Module",
                      "CRUD",
                      "Action",
                      "Result",
                      "Description",
                      "Time (PH)",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-4 py-3"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading || logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        {loading
                          ? "Loading activity logs..."
                          : "No activity matches the selected filters."}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {getActivityUserName(log)}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {log.actor_email || log.user?.email || log.user_id || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4 capitalize">
                          {log.actor_role || log.user?.role || "Unknown"}
                        </td>

                        <td className="px-4 py-4">{log.module}</td>

                        <td className="px-4 py-4 font-semibold">{log.crud_operation || "OTHER"}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                            {log.action}{log.outcome === "FAILED" ? " · FAILED" : ""}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={log.outcome === "FAILED" ? "font-semibold text-red-600" : log.outcome === "PENDING" ? "text-amber-600" : "text-slate-600 dark:text-slate-300"}>{log.outcome || "SUCCESS"}</span>
                          {log.process_stage && <p className="mt-1 text-xs text-slate-500">{log.process_stage.replaceAll("_", " ")}</p>}
                        </td>
                        <td className="max-w-[480px] whitespace-pre-wrap break-words px-4 py-4">
                          {log.process_name && <p className="mb-1 font-semibold">{log.process_name}</p>}
                          {log.description || "No description"}
                          {log.record_id && <p className="mt-1 text-xs text-slate-500">Record: {log.record_id}</p>}
                          <p className="mt-1 text-xs text-slate-400">{log.source || "LEGACY"} · {log.outcome || "SUCCESS"}</p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          {formatTime(log.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </AdminLayout>
  );
}