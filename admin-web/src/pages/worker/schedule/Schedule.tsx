import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  addUnavailableDate,
  deleteUnavailableDate,
  getUnavailableDates,
  getWorkerSchedule,
  saveWorkerSchedule,
  WEEK_DAYS,
  type UnavailableDate,
  type WeekDay,
  type WorkerScheduleInput,
} from "../../../services/scheduleService";

type ScheduleMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const DEFAULT_START_TIME = "08:00";
const DEFAULT_END_TIME = "17:00";
const MAX_REASON_LENGTH = 200;

function createDefaultSchedule(): WorkerScheduleInput[] {
  return WEEK_DAYS.map((day) => ({
    day_of_week: day,
    start_time: DEFAULT_START_TIME,
    end_time: DEFAULT_END_TIME,
    is_available: true,
  }));
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function mergeSchedule(
  records: Awaited<ReturnType<typeof getWorkerSchedule>>,
): WorkerScheduleInput[] {
  const scheduleMap = new Map<WeekDay, WorkerScheduleInput>();

  for (const record of records) {
    scheduleMap.set(record.day_of_week, {
      day_of_week: record.day_of_week,
      start_time: normalizeTime(record.start_time),
      end_time: normalizeTime(record.end_time),
      is_available: record.is_available,
    });
  }

  return WEEK_DAYS.map(
    (day) =>
      scheduleMap.get(day) ?? {
        day_of_week: day,
        start_time: DEFAULT_START_TIME,
        end_time: DEFAULT_END_TIME,
        is_available: false,
      },
  );
}

function normalizeScheduleForComparison(
  schedules: WorkerScheduleInput[],
): WorkerScheduleInput[] {
  return schedules.map((item) => ({
    day_of_week: item.day_of_week,
    start_time: normalizeTime(item.start_time),
    end_time: normalizeTime(item.end_time),
    is_available: item.is_available,
  }));
}

function schedulesEqual(
  first: WorkerScheduleInput[],
  second: WorkerScheduleInput[],
): boolean {
  return (
    JSON.stringify(
      normalizeScheduleForComparison(first),
    ) ===
    JSON.stringify(
      normalizeScheduleForComparison(second),
    )
  );
}

function validateSchedule(
  schedules: WorkerScheduleInput[],
): string | null {
  for (const schedule of schedules) {
    if (!schedule.is_available) {
      continue;
    }

    if (
      !schedule.start_time ||
      !schedule.end_time
    ) {
      return `${schedule.day_of_week}: Start and end times are required.`;
    }

    if (
      schedule.start_time >= schedule.end_time
    ) {
      return `${schedule.day_of_week}: End time must be later than start time.`;
    }
  }

  return null;
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown })
      .message === "string"
  ) {
    const message = (
      error as { message: string }
    ).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

function getManilaDateString(): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")
      ?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")
      ?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")
      ?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Schedule() {
  const realtimeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [workerId, setWorkerId] =
    useState<string | null>(null);
  const [schedule, setSchedule] = useState<
    WorkerScheduleInput[]
  >(createDefaultSchedule);
  const [savedSchedule, setSavedSchedule] =
    useState<WorkerScheduleInput[]>(
      createDefaultSchedule,
    );
  const [dates, setDates] = useState<
    UnavailableDate[]
  >([]);

  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [addingDate, setAddingDate] =
    useState(false);
  const [deletingDateId, setDeletingDateId] =
    useState<number | null>(null);
  const [message, setMessage] =
    useState<ScheduleMessage>(null);

  const today = useMemo(
    () => getManilaDateString(),
    [],
  );

  const activeDays = useMemo(
    () =>
      schedule.filter(
        (item) => item.is_available,
      ).length,
    [schedule],
  );

  const hasUnsavedChanges = useMemo(
    () =>
      !schedulesEqual(
        schedule,
        savedSchedule,
      ),
    [savedSchedule, schedule],
  );

  const busy =
    saving ||
    addingDate ||
    deletingDateId !== null;

  const loadData = useCallback(
    async (
      id: string,
      options: {
        showLoading?: boolean;
      } = {},
    ): Promise<void> => {
      const { showLoading = false } = options;

      if (showLoading) {
        setRefreshing(true);
      }

      try {
        const [dbSchedule, unavailable] =
          await Promise.all([
            getWorkerSchedule(id),
            getUnavailableDates(id),
          ]);

        const merged =
          mergeSchedule(dbSchedule);

        setSchedule(merged);
        setSavedSchedule(merged);
        setDates(unavailable);
        setMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            "Unable to load your availability settings.",
          ),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    let schedulesChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;
    let unavailableChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    async function initialize(): Promise<void> {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        if (!mounted) {
          return;
        }

        setWorkerId(user.id);
        await loadData(user.id);

        const scheduleRefresh = () => {
          if (realtimeTimerRef.current) {
            clearTimeout(
              realtimeTimerRef.current,
            );
          }

          realtimeTimerRef.current =
            setTimeout(() => {
              if (
                !hasUnsavedChanges &&
                mounted
              ) {
                void loadData(user.id);
              }
            }, 300);
        };

        schedulesChannel = supabase
          .channel(
            `worker-schedules-${user.id}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "worker_schedules",
              filter: `worker_id=eq.${user.id}`,
            },
            scheduleRefresh,
          )
          .subscribe();

        unavailableChannel = supabase
          .channel(
            `worker-unavailable-${user.id}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "unavailable_dates",
              filter: `worker_id=eq.${user.id}`,
            },
            scheduleRefresh,
          )
          .subscribe();
      } catch (error) {
        if (mounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              "Unable to initialize the schedule page.",
            ),
          });
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (realtimeTimerRef.current) {
        clearTimeout(
          realtimeTimerRef.current,
        );
      }

      if (schedulesChannel) {
        void supabase.removeChannel(
          schedulesChannel,
        );
      }

      if (unavailableChannel) {
        void supabase.removeChannel(
          unavailableChannel,
        );
      }
    };
  }, [hasUnsavedChanges, loadData]);

  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
  }, [hasUnsavedChanges]);

  const updateSchedule = useCallback(
    (
      index: number,
      updates: Partial<WorkerScheduleInput>,
    ) => {
      setSchedule((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                ...updates,
              }
            : item,
        ),
      );

      setMessage(null);
    },
    [],
  );

  const handleSave =
    useCallback(async (): Promise<void> => {
      if (
        !workerId ||
        saving ||
        !hasUnsavedChanges
      ) {
        return;
      }

      const validationError =
        validateSchedule(schedule);

      if (validationError) {
        toast.warning(validationError);
        setMessage({
          type: "error",
          text: validationError,
        });
        return;
      }

      try {
        setSaving(true);
        setMessage(null);

        const saved =
          await saveWorkerSchedule(
            workerId,
            schedule,
          );

        const merged = mergeSchedule(saved);

        setSchedule(merged);
        setSavedSchedule(merged);

        setMessage({
          type: "success",
          text: "Weekly availability saved successfully.",
        });
        toast.success(
          "Schedule saved successfully.",
        );
      } catch (error) {
        const text = getErrorMessage(
          error,
          "Unable to save your weekly availability.",
        );

        setMessage({
          type: "error",
          text,
        });
        toast.error(text);
      } finally {
        setSaving(false);
      }
    }, [
      hasUnsavedChanges,
      saving,
      schedule,
      workerId,
    ]);

  const handleReset =
    useCallback((): void => {
      if (!hasUnsavedChanges || busy) {
        return;
      }

      const confirmed = window.confirm(
        "Discard your unsaved schedule changes?",
      );

      if (!confirmed) {
        return;
      }

      setSchedule(savedSchedule);
      setMessage(null);
    }, [
      busy,
      hasUnsavedChanges,
      savedSchedule,
    ]);

  const handleAddDate =
    useCallback(async (): Promise<void> => {
      if (!workerId || addingDate) {
        return;
      }

      if (!newDate) {
        toast.warning(
          "Choose an unavailable date.",
        );
        return;
      }

      if (newDate < today) {
        toast.warning(
          "Past dates cannot be added.",
        );
        return;
      }

      if (reason.trim().length > MAX_REASON_LENGTH) {
        toast.warning(
          `Reason must contain ${MAX_REASON_LENGTH} characters or fewer.`,
        );
        return;
      }

      try {
        setAddingDate(true);
        setMessage(null);

        const added =
          await addUnavailableDate(
            workerId,
            newDate,
            reason,
          );

        setDates((current) =>
          [...current, added].sort((a, b) =>
            a.unavailable_date.localeCompare(
              b.unavailable_date,
            ),
          ),
        );
        setNewDate("");
        setReason("");

        setMessage({
          type: "success",
          text: "Unavailable date added successfully.",
        });
        toast.success(
          "Unavailable date added.",
        );
      } catch (error) {
        const text = getErrorMessage(
          error,
          "Unable to add unavailable date.",
        );

        setMessage({
          type: "error",
          text,
        });
        toast.error(text);
      } finally {
        setAddingDate(false);
      }
    }, [
      addingDate,
      newDate,
      reason,
      today,
      workerId,
    ]);

  const handleDeleteDate =
    useCallback(
      async (
        item: UnavailableDate,
      ): Promise<void> => {
        if (
          deletingDateId !== null ||
          busy
        ) {
          return;
        }

        const confirmed = window.confirm(
          `Remove ${formatDate(
            item.unavailable_date,
          )} from unavailable dates?`,
        );

        if (!confirmed) {
          return;
        }

        try {
          setDeletingDateId(item.id);
          setMessage(null);

          await deleteUnavailableDate(
            item.id,
          );

          setDates((current) =>
            current.filter(
              (date) => date.id !== item.id,
            ),
          );

          setMessage({
            type: "success",
            text: "Unavailable date removed successfully.",
          });
          toast.success(
            "Unavailable date removed.",
          );
        } catch (error) {
          const text = getErrorMessage(
            error,
            "Unable to remove unavailable date.",
          );

          setMessage({
            type: "error",
            text,
          });
          toast.error(text);
        } finally {
          setDeletingDateId(null);
        }
      },
      [busy, deletingDateId],
    );

  const handleRefresh =
    useCallback(async (): Promise<void> => {
      if (!workerId || refreshing) {
        return;
      }

      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          "Refresh and discard your unsaved schedule changes?",
        );

        if (!confirmed) {
          return;
        }
      }

      await loadData(workerId, {
        showLoading: true,
      });
    }, [
      hasUnsavedChanges,
      loadData,
      refreshing,
      workerId,
    ]);

  if (loading) {
    return (
      <WorkerLayout>
        <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto max-w-7xl animate-pulse space-y-5 sm:space-y-6">
            <div className="h-48 rounded-[1.75rem] bg-slate-200 dark:bg-slate-800 sm:h-56" />

            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 rounded-[1.5rem] bg-slate-200 dark:bg-slate-800 sm:h-48"
                />
              ))}
            </div>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 pb-32 sm:p-5 sm:pb-10 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
          {message && (
            <div
              role={
                message.type === "error"
                  ? "alert"
                  : "status"
              }
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2">
                {message.type ===
                "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}

                <span className="min-w-0 leading-6">{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMessage(null)
                }
                className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-indigo-600 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:block">
                  <CalendarDays className="h-8 w-8" />
                </div>

                <div>
                  <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                    Availability Management
                  </p>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    My Schedule
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                    Set your weekly working hours
                    and block dates when you are
                    unavailable.
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl sm:w-auto sm:min-w-64 sm:p-5">
                <div>
                  <p className="text-sm text-blue-100">
                    Active Days
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {activeDays}/7
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleRefresh()
                  }
                  disabled={
                    refreshing || busy
                  }
                  className="rounded-xl border border-white/15 bg-white/10 p-3 transition hover:-translate-y-0.5 hover:bg-white/20 disabled:translate-y-0 disabled:opacity-50"
                  aria-label="Refresh schedule"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </header>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
                  Weekly Availability
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Customers can only choose times
                  within your active working hours.
                </p>
              </div>

              {hasUnsavedChanges && (
                <span className="self-start rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {schedule.map(
                (item, index) => (
                  <article
                    key={item.day_of_week}
                    className={`rounded-[1.5rem] border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${
                      item.is_available
                        ? "border-blue-200 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-950/20"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="relative z-10 flex items-center gap-3">
                        <div
                          className={`rounded-xl p-2.5 ${
                            item.is_available
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                              : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white">
                            {item.day_of_week}
                          </h3>

                          <p
                            className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${
                              item.is_available
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-red-500 dark:text-red-300"
                            }`}
                          >
                            {item.is_available ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}

                            {item.is_available
                              ? "Available"
                              : "Unavailable"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={
                          item.is_available
                        }
                        aria-label={`Toggle ${item.day_of_week} availability`}
                        disabled={busy}
                        onClick={() =>
                          updateSchedule(
                            index,
                            {
                              is_available:
                                !item.is_available,
                            },
                          )
                        }
                        className={`relative h-8 w-14 rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-50 ${
                          item.is_available
                            ? "bg-blue-600"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                            item.is_available
                              ? "left-7"
                              : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <TimeField
                        label="Start Time"
                        value={
                          item.start_time
                        }
                        disabled={
                          !item.is_available ||
                          busy
                        }
                        onChange={(value) =>
                          updateSchedule(
                            index,
                            {
                              start_time: value,
                            },
                          )
                        }
                      />

                      <TimeField
                        label="End Time"
                        value={item.end_time}
                        disabled={
                          !item.is_available ||
                          busy
                        }
                        onChange={(value) =>
                          updateSchedule(
                            index,
                            {
                              end_time: value,
                            },
                          )
                        }
                      />
                    </div>
                  </article>
                ),
              )}
            </div>

            <div className="mt-6 hidden items-center justify-end gap-3 border-t border-slate-200 pt-6 sm:flex dark:border-slate-700">
              <button
                type="button"
                onClick={handleReset}
                disabled={
                  !hasUnsavedChanges ||
                  busy
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={
                  !hasUnsavedChanges ||
                  busy
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
                <Save className="h-4 w-4" />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="relative overflow-hidden bg-linear-to-br from-red-600 via-rose-600 to-pink-500 px-5 py-6 text-white sm:px-8 sm:py-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
              />
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <CalendarDays className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    Unavailable Dates
                  </h2>

                  <p className="mt-1 text-sm text-red-100">
                    Block specific dates for
                    leave, vacations, or personal
                    commitments.
                  </p>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Date
                  </span>

                  <input
                    type="date"
                    min={today}
                    value={newDate}
                    disabled={busy}
                    onChange={(event) =>
                      setNewDate(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reason{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </span>

                  <input
                    type="text"
                    value={reason}
                    maxLength={
                      MAX_REASON_LENGTH
                    }
                    disabled={busy}
                    onChange={(event) =>
                      setReason(
                        event.target.value,
                      )
                    }
                    placeholder="Vacation, appointment, personal leave..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-red-950"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {reason.length}/
                    {MAX_REASON_LENGTH}
                  </p>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    void handleAddDate()
                  }
                  disabled={
                    busy || !newDate
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  <Plus className="h-4 w-4" />
                  {addingDate
                    ? "Adding..."
                    : "Add Date"}
                </button>
              </div>

              {dates.length === 0 ? (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/60 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800/30">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-300">
                    <CalendarDays className="h-9 w-9" />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                    No Unavailable Dates
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    You have not blocked any
                    dates. Add one whenever you
                    need time away from bookings.
                  </p>
                </div>
              ) : (
                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {dates.map((item) => (
                    <article
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 dark:text-white">
                          {formatDate(
                            item.unavailable_date,
                          )}
                        </h3>

                        <p className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {item.reason?.trim() ||
                            "No reason provided"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteDate(
                            item,
                          )
                        }
                        disabled={busy}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:translate-y-0 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                        aria-label={`Delete unavailable date ${item.unavailable_date}`}
                      >
                        {deletingDateId ===
                        item.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {hasUnsavedChanges && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:hidden dark:border-slate-700 dark:bg-slate-900/95">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={busy}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />

                {saving
                  ? "Saving..."
                  : "Save"}
              </button>
            </div>
          </div>
        )}
      </main>
    </WorkerLayout>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-900">
        <Clock3 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />

        <input
          type="time"
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="min-w-0 w-full bg-transparent py-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
        />
      </div>
    </label>
  );
}