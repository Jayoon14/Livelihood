import {
  ArrowLeft,
  Ban,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  RotateCw,
  ShieldOff,
  Sparkles,
  Star,
  X,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  Percent,
  ShieldAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import {
  getWorkerPerformanceDetails,
  type WorkerPerformanceDetails,
} from "../../../services/advancedAnalyticsService";
import { supabase } from "../../../lib/supabase";
import {
  getCompleteWorkerProfile,
  getWorkerAvatar,
  getWorkerBookings,
  getWorkerFullName,
  getWorkerReviews,
  normalizeWorkerStatus,
  rejectWorker,
  setWorkerStatus,
  WORKER_STATUS,
  type CompleteWorkerProfile,
  type WorkerBookingSummary,
  type WorkerDocumentRecord,
  type WorkerReviewSummary,
  type WorkerStatus,
} from "../../../services/workerService";

type DocumentItem = { title: string; url: string };

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function displayValue(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string {
  if (!record) return "—";
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim())
      return String(value);
  }
  return "—";
}

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

function documentItems(documents: WorkerDocumentRecord | null): DocumentItem[] {
  if (!documents) return [];
  const row = documents as Record<string, unknown>;
  const candidates: [string, string[]][] = [
    ["Valid ID", ["valid_id", "valid_id_url"]],
    ["Resume", ["resume", "resume_url"]],
    ["TESDA Certificate", ["tesda_certificate", "tesda_certificate_url"]],
    ["Barangay Clearance", ["barangay_clearance", "barangay_clearance_url"]],
    ["Police Clearance", ["police_clearance", "police_clearance_url"]],
    ["NBI Clearance", ["nbi_clearance", "nbi_clearance_url"]],
  ];
  return candidates.flatMap(([title, keys]) => {
    const value = keys
      .map((key) => row[key])
      .find((item) => typeof item === "string" && item.trim());
    return typeof value === "string" ? [{ title, url: value }] : [];
  });
}

export default function WorkerDetails() {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<CompleteWorkerProfile | null>(null);
  const [bookings, setBookings] = useState<WorkerBookingSummary[]>([]);
  const [reviews, setReviews] = useState<WorkerReviewSummary[]>([]);
  const [performance, setPerformance] =
    useState<WorkerPerformanceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const loadWorker = useCallback(
    async (background = false) => {
      if (!id) {
        setError("Worker ID is missing.");
        setLoading(false);
        return;
      }
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [
          profileResult,
          bookingsResult,
          reviewsResult,
          performanceResult,
        ] = await Promise.allSettled([
          getCompleteWorkerProfile(id),
          getWorkerBookings(id),
          getWorkerReviews(id),
          getWorkerPerformanceDetails(id),
        ]);
        if (profileResult.status === "rejected") throw profileResult.reason;
        setDetails(profileResult.value);
        if (bookingsResult.status === "fulfilled")
          setBookings(bookingsResult.value);
        else {
          setBookings([]);
          toast.warning("Worker loaded, but booking history is unavailable.");
        }
        if (reviewsResult.status === "fulfilled")
          setReviews(reviewsResult.value);
        else {
          setReviews([]);
          toast.warning("Worker loaded, but reviews are unavailable.");
        }
        if (performanceResult.status === "fulfilled") {
          setPerformance(performanceResult.value);
        } else {
          setPerformance(null);
          toast.warning("Worker loaded, but advanced performance metrics are unavailable.");
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load worker details.";
        setError(message);
        if (!background) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorker();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorker]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`admin-worker-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "education",
          filter: `profile_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_experience",
          filter: `profile_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_skills",
          filter: `profile_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `profile_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
          filter: `worker_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `worker_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `worker_id=eq.${id}`,
        },
        () => void loadWorker(true),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [id, loadWorker]);

  const documents = useMemo(
    () => documentItems(details?.documents ?? null),
    [details],
  );
  const preview = previewIndex === null ? null : documents[previewIndex];
  const worker = details?.profile ?? null;
  const normalizedStatus = normalizeWorkerStatus(worker?.status);
  const isApproved = normalizedStatus === WORKER_STATUS.APPROVED;
  const fullName = worker ? getWorkerFullName(worker) : "Worker";
  const avatar = worker ? getWorkerAvatar(worker) : null;
  const metrics = useMemo(() => {
    const completed = bookings.filter(
      (booking) => booking.status.trim().toLowerCase() === "completed",
    ).length;
    const average = reviews.length
      ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
      : 0;
    return {
      total: bookings.length,
      completed,
      average,
      reviews: reviews.length,
    };
  }, [bookings, reviews]);

  useEffect(() => {
    if (!preview) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewIndex(null);
      if (event.key === "ArrowLeft")
        setPreviewIndex((index) =>
          index === null ? null : Math.max(0, index - 1),
        );
      if (event.key === "ArrowRight")
        setPreviewIndex((index) =>
          index === null ? null : Math.min(documents.length - 1, index + 1),
        );
      if (event.key === "+" || event.key === "=")
        setZoom((value) => Math.min(3, value + 0.2));
      if (event.key === "-") setZoom((value) => Math.max(0.5, value - 0.2));
      if (event.key.toLowerCase() === "r") setRotation((value) => value + 90);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [preview, documents.length]);

  async function changeStatus(next: WorkerStatus) {
    if (!worker) return;

    const isReject = next === WORKER_STATUS.REJECTED;

    const confirmed = await confirmAction(
      isReject
        ? `Reject and permanently delete ${fullName}'s registration? The worker must register again.`
        : `Change ${fullName}'s account status to ${next}?`,
      {
        title: isReject ? "Reject worker registration" : "Update worker status",
        confirmText: next,
      },
    );

    if (!confirmed) return;

    setProcessing(true);

    const toastId = toast.loading(
      isReject
        ? "Rejecting and deleting worker registration..."
        : "Updating worker status...",
    );

    try {
      if (isReject) {
        await rejectWorker(worker.id);

        toast.success(
          "Worker registration was rejected and deleted. The same email can now register again.",
          {
            id: toastId,
          },
        );

        window.location.assign("/workers");
        return;
      }

      const updated = await setWorkerStatus(worker.id, next);

      setDetails((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                ...updated,
              },
            }
          : current,
      );

      toast.success(`Worker status changed to ${next}.`, {
        id: toastId,
      });
    } catch (statusError) {
      console.error("Worker status operation failed:", statusError);

      toast.error(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update worker status.",
        {
          id: toastId,
        },
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading)
    return (
      <AdminLayout>
        <div className="p-12 text-center text-slate-500">
          Loading worker details...
        </div>
      </AdminLayout>
    );
  if (error || !details || !worker)
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <p>{error || "Worker was not found."}</p>
            <button
              onClick={() => void loadWorker()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </AdminLayout>
    );

  const education = details.education as Record<string, unknown> | null;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/workers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Back to workers
          </Link>
          <button
            disabled={refreshing}
            onClick={() => void loadWorker(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold dark:border-slate-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </header>

        <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center dark:border-slate-700 dark:bg-slate-900">
          {avatar ? (
            <img
              src={avatar}
              alt={fullName}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-700">
              {fullName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="wrap-break-word text-3xl font-bold dark:text-white">
              {fullName}
            </h1>
            <p className="mt-1 text-slate-500">{worker.email || "No email"}</p>
            <span
              className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-semibold ${statusClass(normalizedStatus)}`}
            >
              {normalizedStatus}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {normalizedStatus !== WORKER_STATUS.APPROVED && (
              <Action
                icon={<CheckCircle2 className="h-4 w-4" />}
                text="Approve"
                disabled={processing}
                onClick={() => void changeStatus(WORKER_STATUS.APPROVED)}
                className="bg-emerald-600"
              />
            )}
            {normalizedStatus !== WORKER_STATUS.REJECTED && (
              <Action
                icon={<Ban className="h-4 w-4" />}
                text="Reject"
                disabled={processing}
                onClick={() => void changeStatus(WORKER_STATUS.REJECTED)}
                className="bg-red-600"
              />
            )}
            {normalizedStatus !== WORKER_STATUS.DISABLED && (
              <Action
                icon={<ShieldOff className="h-4 w-4" />}
                text="Disable"
                disabled={processing}
                onClick={() => void changeStatus(WORKER_STATUS.DISABLED)}
                className="bg-slate-700"
              />
            )}
          </div>
        </section>

        {isApproved ? (
          <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total bookings"
              value={metrics.total}
              description="All service requests received"
              icon={<CalendarCheck2 className="h-5 w-5" />}
              accentClass="from-blue-500 to-indigo-600"
              iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            />
            <MetricCard
              title="Completed jobs"
              value={metrics.completed}
              description="Successfully finished services"
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              accentClass="from-emerald-500 to-teal-600"
              iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            />
            <MetricCard
              title="Customer reviews"
              value={metrics.reviews}
              description="Feedback submitted by customers"
              icon={<Star className="h-5 w-5" />}
              accentClass="from-amber-400 to-orange-500"
              iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            />
            <MetricCard
              title="Average rating"
              value={metrics.reviews ? metrics.average.toFixed(1) : "No rating"}
              description={
                metrics.reviews
                  ? "Overall customer satisfaction"
                  : "Ratings will appear after reviews"
              }
              icon={<Sparkles className="h-5 w-5" />}
              accentClass="from-violet-500 to-fuchsia-600"
              iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Advanced performance</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Worker performance score</h2>
                <p className="mt-1 text-sm text-slate-500">Completion 45% · customer rating 35% · cancellation control 10% · complaint control 10%</p>
              </div>
              <div className="rounded-2xl bg-violet-50 px-6 py-4 text-center dark:bg-violet-500/10">
                <p className="text-xs font-bold uppercase text-violet-600">Score</p>
                <p className="text-3xl font-black text-violet-700 dark:text-violet-300">{performance?.performanceScore.toFixed(1) ?? "—"}</p>
                <p className="text-xs text-slate-500">out of 100</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Completion rate"
                value={performance ? `${performance.completionRate.toFixed(1)}%` : "—"}
                description={`${performance?.completedJobs ?? 0} completed of ${performance?.totalBookings ?? 0} bookings`}
                icon={<TrendingUp className="h-5 w-5" />}
                accentClass="from-emerald-500 to-teal-600"
                iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
              />
              <MetricCard
                title="Cancellation rate"
                value={performance ? `${performance.cancellationRate.toFixed(1)}%` : "—"}
                description={`${performance?.cancelledJobs ?? 0} cancelled or rejected`}
                icon={<Percent className="h-5 w-5" />}
                accentClass="from-rose-500 to-red-600"
                iconClass="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
              />
              <MetricCard
                title="Complaint rate"
                value={performance ? `${performance.complaintRate.toFixed(1)}%` : "—"}
                description={`${performance?.complaints ?? 0} reports or complaints`}
                icon={<ShieldAlert className="h-5 w-5" />}
                accentClass="from-amber-500 to-orange-600"
                iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
              />
              <MetricCard
                title="Quality rating"
                value={performance?.averageRating.toFixed(1) ?? "—"}
                description="Average verified customer rating"
                icon={<Star className="h-5 w-5" />}
                accentClass="from-violet-500 to-fuchsia-600"
                iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
              />
            </div>
          </section>
          </>
        ) : (
          <section className="relative overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-blue-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:via-slate-900 dark:to-blue-500/10">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner dark:bg-amber-500/15 dark:text-amber-300">
                <Sparkles className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Performance insights locked
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  Approve this worker to unlock activity metrics
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Booking totals, completed jobs, customer reviews, ratings,
                  offered services, and booking history will appear only after
                  the worker is approved and begins receiving service activity.
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${statusClass(
                  normalizedStatus,
                )}`}
              >
                {normalizedStatus}
              </span>
            </div>
          </section>
        )}

        <Section title="Personal Information">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Info title="Full Name" value={fullName} />
            <Info title="Email" value={worker.email} />
            <Info title="Phone" value={worker.phone} />
            <Info title="Birth Date" value={formatDate(worker.birth_date)} />
            <Info title="Gender" value={worker.gender} />
            <Info title="Civil Status" value={worker.civil_status} />
            <Info title="Religion" value={worker.religion} />
            <Info
              title="Address"
              value={[
                worker.house_no,
                worker.street,
                worker.address,
                worker.barangay,
                worker.municipality,
                worker.province,
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Info title="Registered" value={formatDate(worker.created_at)} />
          </div>
        </Section>

        <Section title="Educational Background">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Info
              title="Highest Attainment"
              value={displayValue(education, "highest_attainment")}
            />
            <Info
              title="Elementary"
              value={displayValue(education, "elementary")}
            />
            <Info
              title="Secondary"
              value={displayValue(education, "secondary")}
            />
            <Info
              title="Senior High"
              value={displayValue(education, "senior_high")}
            />
            <Info title="College" value={displayValue(education, "college")} />
            <Info title="Course" value={displayValue(education, "course")} />
            <Info
              title="Year Graduated"
              value={displayValue(education, "year_graduated")}
            />
            <Info title="TESDA" value={displayValue(education, "tesda")} />
            <Info title="PRC" value={displayValue(education, "prc")} />
            <Info
              title="Trainings"
              value={displayValue(education, "trainings")}
            />
          </div>
        </Section>

        <Section title={`Work Experience (${details.workExperience.length})`}>
          {details.workExperience.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {details.workExperience.map((job) => {
                const row = job as unknown as Record<string, unknown>;
                return (
                  <article
                    key={String(job.id)}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <Info
                      title="Company"
                      value={displayValue(row, "company_name", "company")}
                    />
                    <Info
                      title="Position"
                      value={displayValue(row, "position")}
                    />
                    <Info
                      title="Employment Status"
                      value={displayValue(row, "employment_status")}
                    />
                    <Info
                      title="Start"
                      value={displayValue(row, "start_year", "start_date")}
                    />
                    <Info
                      title="End"
                      value={displayValue(row, "end_year", "end_date")}
                    />
                    <Info
                      title="Description"
                      value={displayValue(row, "description")}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty text="No work experience recorded." />
          )}
        </Section>

        <Section title={`Skills (${details.skills.length})`}>
          <div className="flex flex-wrap gap-2">
            {details.skills.length ? (
              details.skills.map((skill) => (
                <span
                  key={String(skill.id)}
                  className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                >
                  {String(
                    (skill as unknown as Record<string, unknown>).skill ??
                      (skill as unknown as Record<string, unknown>)
                        .skill_name ??
                      "Skill",
                  )}
                </span>
              ))
            ) : (
              <Empty text="No skills added." />
            )}
          </div>
        </Section>

        {isApproved && details.services.length > 0 && (
          <Section title={`Services Offered (${details.services.length})`}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {details.services.map((service) => (
                <article
                  key={String(service.id)}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <p className="font-bold">
                    {service.service_name || "Unnamed service"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {service.category || "No category"}
                  </p>
                  <p className="mt-2 text-sm">
                    {service.description || "No description"}
                  </p>
                  <p className="mt-3 font-semibold">
                    ₱{Number(service.price ?? 0).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </Section>
        )}

        <Section title={`Documents (${documents.length})`}>
          {documents.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map((doc, index) => (
                <button
                  key={doc.title}
                  onClick={() => {
                    setPreviewIndex(index);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span>
                    <span className="text-xs text-slate-500">Document</span>
                    <span className="block font-semibold">{doc.title}</span>
                  </span>
                  <FileText className="h-5 w-5 text-blue-600" />
                </button>
              ))}
            </div>
          ) : (
            <Empty text="No documents uploaded." />
          )}
        </Section>

        {isApproved && bookings.length > 0 && (
          <Section title={`Booking History (${bookings.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-sm">
                <thead className="bg-slate-50 text-left dark:bg-slate-800/60">
                  <tr>
                    <th className="p-3">Booking</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="p-3">
                        <Link
                          to={`/bookings/${booking.id}`}
                          className="font-semibold text-blue-600"
                        >
                          #{booking.id}
                        </Link>
                      </td>
                      <td className="p-3">
                        {booking.customer_id ? (
                          <Link
                            to={`/customers/${booking.customer_id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {booking.customer_name}
                          </Link>
                        ) : (
                          booking.customer_name
                        )}
                      </td>
                      <td className="p-3">{booking.service_name || "—"}</td>
                      <td className="p-3">
                        {formatDate(booking.booking_date)}{" "}
                        {booking.booking_time || ""}
                      </td>
                      <td className="p-3">{booking.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {isApproved && reviews.length > 0 && (
          <Section title={`Reviews (${reviews.length})`}>
            <div className="space-y-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">
                      {review.customer_id ? (
                        <Link
                          to={`/customers/${review.customer_id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {review.customer_name}
                        </Link>
                      ) : (
                        review.customer_name
                      )}
                    </p>
                    <p className="font-semibold text-amber-600">
                      ★ {review.rating.toFixed(1)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {review.review || "No written review."}
                  </p>
                  <Link
                    to={`/bookings/${review.booking_id}`}
                    className="mt-2 inline-block text-xs text-blue-600"
                  >
                    Booking #{review.booking_id}
                  </Link>
                </article>
              ))}
            </div>
          </Section>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="font-bold">{preview.title}</h2>
                <p className="text-xs text-slate-500">
                  ESC close · ←/→ navigate · +/- zoom · R rotate
                </p>
              </div>
              <button onClick={() => setPreviewIndex(null)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex h-[70vh] items-center justify-center overflow-auto bg-slate-100 dark:bg-slate-950">
              {preview.url.toLowerCase().split("?")[0].endsWith(".pdf") ? (
                <iframe
                  src={preview.url}
                  title={preview.title}
                  className="h-full w-full"
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.title}
                  className="max-h-full max-w-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform .2s",
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2 border-t p-4 dark:border-slate-700">
              <Control
                disabled={previewIndex === 0}
                onClick={() =>
                  setPreviewIndex((value) =>
                    value === null ? null : Math.max(0, value - 1),
                  )
                }
                icon={<ChevronLeft className="h-4 w-4" />}
                text="Previous"
              />
              <Control
                disabled={previewIndex === documents.length - 1}
                onClick={() =>
                  setPreviewIndex((value) =>
                    value === null
                      ? null
                      : Math.min(documents.length - 1, value + 1),
                  )
                }
                icon={<ChevronRight className="h-4 w-4" />}
                text="Next"
              />
              {!preview.url.toLowerCase().split("?")[0].endsWith(".pdf") && (
                <>
                  <Control
                    onClick={() => setZoom((v) => Math.min(3, v + 0.2))}
                    icon={<ZoomIn className="h-4 w-4" />}
                    text="Zoom +"
                  />
                  <Control
                    onClick={() => setZoom((v) => Math.max(0.5, v - 0.2))}
                    icon={<ZoomOut className="h-4 w-4" />}
                    text="Zoom -"
                  />
                  <Control
                    onClick={() => setRotation((v) => v + 90)}
                    icon={<RotateCw className="h-4 w-4" />}
                    text="Rotate"
                  />
                </>
              )}
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
function Info({ title, value }: { title: string; value: unknown }) {
  const display =
    value === null || value === undefined || !String(value).trim()
      ? "—"
      : String(value);
  return (
    <div className="mb-3">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 wrap-break-word font-semibold">{display}</p>
    </div>
  );
}
function MetricCard({
  title,
  value,
  description,
  icon,
  accentClass,
  iconClass,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  accentClass: string;
  iconClass: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${accentClass}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
        <div className="h-10 w-10 rounded-full bg-slate-100/80 blur-xl transition group-hover:scale-150 dark:bg-slate-700/50" />
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
      {text}
    </div>
  );
}
function Action({
  icon,
  text,
  className,
  ...props
}: {
  icon: ReactNode;
  text: string;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${className}`}
    >
      {icon}
      {text}
    </button>
  );
}
function Control({
  icon,
  text,
  ...props
}: {
  icon: ReactNode;
  text: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
    >
      {icon}
      {text}
    </button>
  );
}
