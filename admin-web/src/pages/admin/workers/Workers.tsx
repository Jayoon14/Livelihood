import {
  Ban,
  Download,
  FileText,
  RefreshCw,
  Search,
  ShieldOff,
  Star,
  UserCheck,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  getAdminWorkers,
  setWorkerStatus,
  WORKER_STATUS,
  type AdminWorkerListItem,
  type WorkerStatus,
} from "../../../services/workerService";

const PAGE_SIZE = 10;
type StatusFilter = WorkerStatus | "All";
type SortOption =
  | "Newest"
  | "Oldest"
  | "Name A-Z"
  | "Highest Rating"
  | "Most Completed";

function statusClass(status: WorkerStatus): string {
  switch (status) {
    case WORKER_STATUS.APPROVED:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case WORKER_STATUS.PENDING:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case WORKER_STATUS.DISABLED:
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    default:
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Workers() {
  const [workers, setWorkers] = useState<AdminWorkerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortOption>("Newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkers = useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setWorkers(await getAdminWorkers());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load workers.";
      setError(message);
      if (!background) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => void loadWorkers(), [loadWorkers]);

  useEffect(() => {
    let mounted = true;

    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        if (mounted) {
          void loadWorkers(true);
        }
      }, 300);
    };

    const channel = supabase
      .channel("admin-workers-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "role=eq.worker",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        scheduleRealtimeRefresh,
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error("Admin workers realtime channel error.");
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error("Admin workers realtime connection timed out.");
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
  }, [loadWorkers]);

  useEffect(() => setPage(1), [search, status, sort]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = workers.filter((worker) => {
      const matchesStatus =
        status === "All" || worker.normalized_status === status;
      const searchable = [
        worker.full_name,
        worker.email,
        worker.phone,
        worker.municipality,
        worker.province,
        worker.normalized_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "Oldest":
          return (
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
          );
        case "Name A-Z":
          return a.full_name.localeCompare(b.full_name);
        case "Highest Rating":
          return b.average_rating - a.average_rating;
        case "Most Completed":
          return b.completed_jobs - a.completed_jobs;
        default:
          return (
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
          );
      }
    });
  }, [workers, search, status, sort]);

  const summary = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter(
        (w) => w.normalized_status === WORKER_STATUS.PENDING,
      ).length,
      approved: filtered.filter(
        (w) => w.normalized_status === WORKER_STATUS.APPROVED,
      ).length,
      rejected: filtered.filter(
        (w) => w.normalized_status === WORKER_STATUS.REJECTED,
      ).length,
      disabled: filtered.filter(
        (w) =>
          w.normalized_status === WORKER_STATUS.DISABLED ||
          w.normalized_status === WORKER_STATUS.BLOCKED,
      ).length,
      rated: filtered.filter((w) => w.average_rating > 0).length,
    }),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  async function changeStatus(worker: AdminWorkerListItem, next: WorkerStatus) {
    const confirmed = await confirmAction(
      `Change ${worker.full_name}'s status to ${next}?`,
      {
        title: "Update worker status",
        confirmText: next,
      },
    );
    if (!confirmed) return;
    setProcessingId(worker.id);
    const toastId = toast.loading("Updating worker status...");
    try {
      const updated = await setWorkerStatus(worker.id, next);
      setWorkers((current) =>
        current.map((item) =>
          item.id === worker.id
            ? { ...item, ...updated, normalized_status: next }
            : item,
        ),
      );
      toast.success(`${worker.full_name} is now ${next}.`, { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update worker status.",
        { id: toastId },
      );
    } finally {
      setProcessingId(null);
    }
  }

  function exportCsv() {
    if (!filtered.length)
      return toast.warning("There are no workers to export.");
    const rows = filtered.map((w) => [
      w.id,
      w.full_name,
      w.email,
      w.phone,
      w.municipality,
      w.province,
      w.normalized_status,
      w.average_rating,
      w.completed_jobs,
      w.created_at,
    ]);
    const csv = [
      [
        "Worker ID",
        "Full Name",
        "Email",
        "Phone",
        "Municipality",
        "Province",
        "Status",
        "Average Rating",
        "Completed Jobs",
        "Registered At",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `workers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Workers Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review registrations, ratings, jobs, and account status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="btn-secondary">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => window.print()} className="btn-secondary">
              <FileText className="h-4 w-4" /> Print / PDF
            </button>
            <button
              disabled={refreshing}
              onClick={() => void loadWorkers(true)}
              className="btn-secondary"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            title="Total"
            value={summary.total}
            icon={<UsersRound className="h-5 w-5" />}
          />
          <Stat
            title="Pending"
            value={summary.pending}
            icon={<UsersRound className="h-5 w-5" />}
          />
          <Stat
            title="Approved"
            value={summary.approved}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <Stat
            title="Rejected"
            value={summary.rejected}
            icon={<Ban className="h-5 w-5" />}
          />
          <Stat
            title="Disabled / Blocked"
            value={summary.disabled}
            icon={<ShieldOff className="h-5 w-5" />}
          />
          <Stat
            title="With Ratings"
            value={summary.rated}
            icon={<Star className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_190px_200px_auto] dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, or location"
              className="input pl-10"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="input"
          >
            <option value="All">All statuses</option>
            {Object.values(WORKER_STATUS).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="input"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Name A-Z</option>
            <option>Highest Rating</option>
            <option>Most Completed</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setStatus("All");
              setSort("Newest");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold dark:border-slate-700"
          >
            Reset
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <State text="Loading workers..." />
          ) : error ? (
            <State text={error} />
          ) : !visible.length ? (
            <State text="No workers found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-287.5">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="p-4">Worker</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Completed</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((worker) => (
                    <tr
                      key={worker.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {worker.avatar ? (
                            <img
                              src={worker.avatar}
                              alt={worker.full_name}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                              {worker.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/workers/${worker.id}`}
                              className="font-semibold hover:text-blue-600 hover:underline"
                            >
                              {worker.full_name}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {worker.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <p>{worker.email || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {worker.phone || "—"}
                        </p>
                      </td>
                      <td className="p-4 text-sm">
                        {worker.municipality || "—"}, {worker.province || "—"}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-amber-600">
                          ★ {worker.average_rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">
                        {worker.completed_jobs}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(worker.normalized_status)}`}
                        >
                          {worker.normalized_status}
                        </span>
                      </td>
                      <td className="p-4 print:hidden">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/workers/${worker.id}`}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            View
                          </Link>
                          {worker.normalized_status !==
                            WORKER_STATUS.APPROVED && (
                            <button
                              disabled={processingId === worker.id}
                              onClick={() =>
                                void changeStatus(
                                  worker,
                                  WORKER_STATUS.APPROVED,
                                )
                              }
                              className="action bg-emerald-600"
                            >
                              Approve
                            </button>
                          )}
                          {worker.normalized_status !==
                            WORKER_STATUS.DISABLED && (
                            <button
                              disabled={processingId === worker.id}
                              onClick={() =>
                                void changeStatus(
                                  worker,
                                  WORKER_STATUS.DISABLED,
                                )
                              }
                              className="action bg-slate-700"
                            >
                              Disable
                            </button>
                          )}
                          {worker.normalized_status !==
                            WORKER_STATUS.BLOCKED && (
                            <button
                              disabled={processingId === worker.id}
                              onClick={() =>
                                void changeStatus(worker, WORKER_STATUS.BLOCKED)
                              }
                              className="action bg-red-600"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex justify-between border-t p-4 print:hidden">
              <p className="text-sm text-slate-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={safePage === 1}
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  className="page"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                  className="page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      <style>{`.btn-secondary{display:inline-flex;align-items:center;gap:.5rem;border:1px solid rgb(226 232 240);border-radius:.75rem;padding:.625rem 1rem;font-size:.875rem;font-weight:600}.input{width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;background:transparent;padding:.625rem .75rem;outline:none}.action{border-radius:.5rem;padding:.5rem .75rem;font-size:.75rem;font-weight:700;color:white}.page{border:1px solid rgb(226 232 240);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;font-weight:600}.page:disabled,.action:disabled{opacity:.4}`}</style>
    </AdminLayout>
  );
}

function Stat({
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        {icon}
      </span>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </article>
  );
}
function State({ text }: { text: string }) {
  return <div className="p-12 text-center text-slate-500">{text}</div>;
}
