import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  LoaderCircle,
  Package,
  Pencil,
  PhilippinePeso,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  createService,
  deleteMyService,
  getMyServices,
  updateService,
  SERVICE_STATUS,
  type DurationUnit,
  type PricingType,
  type SchedulingType,
  type ServicePayload,
  type ServiceStatus,
  type WorkerService,
} from "../../../services/serviceService";

type StatusFilter = "All" | ServiceStatus;
type SortOption =
  | "newest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc";

interface ServiceFormState {
  category: string;
  serviceName: string;
  description: string;
  price: string;
  schedulingType: SchedulingType;
  durationValue: string;
  durationUnit: DurationUnit;
  pricingType: PricingType;
}

interface FormErrors {
  category?: string;
  serviceName?: string;
  description?: string;
  price?: string;
  durationValue?: string;
}

type PageMessage = {
  type: "success" | "error";
  text: string;
} | null;

const EMPTY_FORM: ServiceFormState = {
  category: "",
  serviceName: "",
  description: "",
  price: "",
  schedulingType: "hourly",
  durationValue: "1",
  durationUnit: "hour",
  pricingType: "fixed",
};

const PAGE_SIZE = 8;

const CATEGORY_SUGGESTIONS = [
  "Appliance Repair",
  "Carpentry",
  "Cleaning",
  "Computer Services",
  "Electrical",
  "Gardening",
  "Home Repair",
  "Laundry",
  "Painting",
  "Plumbing",
  "Tailoring",
  "Tutoring",
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

function normalizeService(value: WorkerService): WorkerService {
  return {
    ...value,
    category: value.category?.trim() || "Uncategorized",
    service_name: value.service_name?.trim() || "Unnamed Service",
    description: value.description?.trim() || "",
    price: Number(value.price) || 0,
    scheduling_type:
      value.scheduling_type === "project" ? "project" : "hourly",
    duration_value: Math.max(Number(value.duration_value) || 1, 1),
    duration_unit: ["hour", "day", "week", "month"].includes(
      String(value.duration_unit),
    )
      ? value.duration_unit
      : "hour",
    pricing_type: ["hourly", "daily", "fixed"].includes(
      String(value.pricing_type),
    )
      ? value.pricing_type
      : "fixed",
    status:
      value.status === SERVICE_STATUS.APPROVED ||
      value.status === SERVICE_STATUS.REJECTED
        ? value.status
        : SERVICE_STATUS.PENDING,
  };
}

function validateForm(form: ServiceFormState): FormErrors {
  const errors: FormErrors = {};
  const category = form.category.trim();
  const serviceName = form.serviceName.trim();
  const description = form.description.trim();
  const price = Number(form.price);
  const durationValue = Number(form.durationValue);

  if (!category) {
    errors.category = "Category is required.";
  } else if (category.length > 100) {
    errors.category = "Category must contain 100 characters or fewer.";
  }

  if (!serviceName) {
    errors.serviceName = "Service name is required.";
  } else if (serviceName.length > 150) {
    errors.serviceName = "Service name must contain 150 characters or fewer.";
  }

  if (description.length > 2_000) {
    errors.description = "Description must contain 2,000 characters or fewer.";
  }

  if (!form.durationValue.trim()) {
    errors.durationValue = "Duration is required.";
  } else if (!Number.isInteger(durationValue) || durationValue <= 0) {
    errors.durationValue = "Enter a whole number greater than zero.";
  } else if (durationValue > 365) {
    errors.durationValue = "Duration is too long.";
  }

  if (!form.price.trim()) {
    errors.price = "Price is required.";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Enter a valid price greater than zero.";
  } else if (price > 1_000_000) {
    errors.price = "Price must not exceed ₱1,000,000.";
  }

  return errors;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function getPricingLabel(type: PricingType): string {
  switch (type) {
    case "hourly":
      return "Orasan";
    case "daily":
      return "Arawan";
    case "fixed":
    default:
      return "Pakyawan";
  }
}

function getPriceLabel(type: PricingType): string {
  switch (type) {
    case "hourly":
      return "Hourly Rate";
    case "daily":
      return "Daily Rate";
    case "fixed":
    default:
      return "Contract Price";
  }
}

function getDurationLabel(service: WorkerService): string {
  const value = service.duration_value;
  const unit = service.duration_unit;
  const unitLabel = {
    hour: "Hour",
    day: "Day",
    week: "Week",
    month: "Month",
  }[unit];
  return `${value} ${unitLabel}${value === 1 ? "" : "s"}`;
}

function getStatusClasses(status: ServiceStatus): string {
  switch (status) {
    case SERVICE_STATUS.APPROVED:
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";

    case SERVICE_STATUS.REJECTED:
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300";

    case SERVICE_STATUS.PENDING:
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

function formFromService(service: WorkerService): ServiceFormState {
  return {
    category: service.category,
    serviceName: service.service_name,
    description: service.description ?? "",
    price: String(service.price),
    schedulingType: service.scheduling_type,
    durationValue: String(service.duration_value),
    durationUnit: service.duration_unit,
    pricingType: service.pricing_type,
  };
}

function serializeForm(form: ServiceFormState): string {
  return JSON.stringify({
    category: form.category.trim(),
    serviceName: form.serviceName.trim(),
    description: form.description.trim(),
    price: form.price.trim(),
    schedulingType: form.schedulingType,
    durationValue: form.durationValue.trim(),
    durationUnit: form.durationUnit,
    pricingType: form.pricingType,
  });
}

export default function Services() {
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialForm, setInitialForm] =
    useState<ServiceFormState>(EMPTY_FORM);

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<WorkerService | null>(
    null,
  );
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<PageMessage>(null);

  const hasUnsavedChanges = useMemo(
    () =>
      formOpen && serializeForm(form) !== serializeForm(initialForm),
    [form, formOpen, initialForm],
  );

  const loadServices = useCallback(
    async (
      id: string,
      options: {
        showRefresh?: boolean;
      } = {},
    ): Promise<void> => {
      if (options.showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getMyServices(id);

        setServices((data ?? []).map(normalizeService));
        setMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load your services."),
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

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
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!mounted) {
          return;
        }

        setWorkerId(user.id);
        await loadServices(user.id);

        channel = supabase
          .channel(`worker-services-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "services",
              filter: `worker_id=eq.${user.id}`,
            },
            () => {
              if (realtimeTimerRef.current) {
                clearTimeout(realtimeTimerRef.current);
              }

              realtimeTimerRef.current = setTimeout(() => {
                if (mounted) {
                  void loadServices(user.id);
                }
              }, 300);
            },
          )
          .subscribe();
      } catch (error) {
        if (mounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              "Unable to initialize the services page.",
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
        clearTimeout(realtimeTimerRef.current);
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadServices]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [search, sort, statusFilter]);

  const statistics = useMemo(
    () =>
      services.reduce(
        (result, service) => {
          result.total += 1;
          result[service.status] += 1;

          return result;
        },
        {
          total: 0,
          Approved: 0,
          Pending: 0,
          Rejected: 0,
        } as {
          total: number;
          Approved: number;
          Pending: number;
          Rejected: number;
        },
      ),
    [services],
  );

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const matchesSearch =
        !keyword ||
        service.category.toLowerCase().includes(keyword) ||
        service.service_name.toLowerCase().includes(keyword) ||
        (service.description ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" || service.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((first, second) => {
      switch (sort) {
        case "name-asc":
          return first.service_name.localeCompare(second.service_name);

        case "name-desc":
          return second.service_name.localeCompare(first.service_name);

        case "price-asc":
          return first.price - second.price;

        case "price-desc":
          return second.price - first.price;

        case "newest":
        default:
          return second.id - first.id;
      }
    });
  }, [search, services, sort, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / PAGE_SIZE),
  );

  const paginatedServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, page]);

  useEffect(() => {
    if (page <= totalPages) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPage(totalPages);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [page, totalPages]);

  function updateFormField<K extends keyof ServiceFormState>(
    field: K,
    value: ServiceFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setMessage(null);
  }

  function openCreateForm(): void {
    const nextForm = { ...EMPTY_FORM };

    setEditingService(null);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setMessage(null);
    setFormOpen(true);
  }

  function openEditForm(service: WorkerService): void {
    const nextForm = formFromService(service);

    setEditingService(service);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setMessage(null);
    setFormOpen(true);
  }

  const requestCloseForm = useCallback(async (): Promise<void> => {
    if (saving) {
      return;
    }

    if (hasUnsavedChanges) {
      const confirmed = await confirmAction(
        "Discard your unsaved service changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    setFormOpen(false);
    setEditingService(null);
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setFormErrors({});
  }, [hasUnsavedChanges, saving]);

  useEffect(() => {
    if (!formOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        void requestCloseForm();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [formOpen, hasUnsavedChanges, requestCloseForm]);

  function resetForm(): void {
    setForm({
      ...initialForm,
    });
    setFormErrors({});
    setMessage(null);
  }

  async function saveService(): Promise<void> {
    if (saving || !workerId) {
      return;
    }

    const errors = validateForm(form);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setMessage({
        type: "error",
        text: "Please correct the highlighted fields.",
      });
      return;
    }

    const payload: ServicePayload = {
      category: form.category.trim(),
      service_name: form.serviceName.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      scheduling_type: form.schedulingType,
      duration_value: Number(form.durationValue),
      duration_unit: form.durationUnit,
      pricing_type: form.pricingType,
    };

    try {
      setSaving(true);

      if (editingService) {
        const updated = normalizeService(
          await updateService(editingService.id, payload),
        );

        setServices((current) =>
          current.map((service) =>
            service.id === updated.id ? updated : service,
          ),
        );

        setMessage({
          type: "success",
          text: "Service updated and resubmitted for approval.",
        });
        toast.success("Service updated successfully.");
      } else {
        const created = normalizeService(
          await createService(workerId, payload),
        );

        setServices((current) => [created, ...current]);

        setMessage({
          type: "success",
          text: "Service created and submitted for approval.",
        });
        toast.success("Service created successfully.");
      }

      setFormOpen(false);
      setEditingService(null);
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
      setFormErrors({});
    } catch (error) {
      const text = getErrorMessage(error, "Unable to save the service.");

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setSaving(false);
    }
  }

  async function removeService(service: WorkerService): Promise<void> {
    if (!workerId || deletingId !== null) {
      return;
    }

    const confirmed = await confirmAction(
      `Delete "${service.service_name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(service.id);

      await deleteMyService(service.id, workerId);

      setServices((current) =>
        current.filter((item) => item.id !== service.id),
      );

      if (editingService?.id === service.id) {
        setFormOpen(false);
        setEditingService(null);
      }

      setMessage({
        type: "success",
        text: "Service deleted successfully.",
      });
      toast.success("Service deleted successfully.");
    } catch (error) {
      const text = getErrorMessage(error, "Unable to delete the service.");

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh(): Promise<void> {
    if (!workerId || refreshing) {
      return;
    }

    await loadServices(workerId, {
      showRefresh: true,
    });
  }

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 pb-24 sm:p-5 lg:p-8 dark:bg-slate-950">
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
              role={message.type === "error" ? "alert" : "status"}
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2">
                {message.type === "error" && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}

                <span className="min-w-0 leading-6">{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-indigo-700 to-violet-700 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-9">
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

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                  Worker Services
                </p>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  My Services
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                  Create and manage the services customers can request from you.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Service
                </button>
              </div>
            </div>
          </header>

          <section
            aria-label="Service statistics"
            className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
          >
            <StatCard
              label="Total Services"
              value={statistics.total}
              icon={Package}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            />

            <StatCard
              label="Approved"
              value={statistics.Approved}
              icon={CircleCheck}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            />

            <StatCard
              label="Pending"
              value={statistics.Pending}
              icon={Clock3}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            />

            <StatCard
              label="Rejected"
              value={statistics.Rejected}
              icon={CircleX}
              iconClassName="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
            />
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_210px_210px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search services, categories, or descriptions..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              >
                <option value="newest">Newest First</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="price-asc">Lowest Price</option>
                <option value="price-desc">Highest Price</option>
              </select>
            </div>
          </section>

          {loading ? (
            <section className="grid gap-4 md:grid-cols-2 xl:gap-5">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[1.5rem] bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </section>
          ) : paginatedServices.length === 0 ? (
            <section className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:py-16">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 sm:h-24 sm:w-24">
                <Package className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
                No Services Found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {search || statusFilter !== "All"
                  ? "No services match the current search or status filter."
                  : "Add your first service so customers can discover and book your work."}
              </p>

              {!search && statusFilter === "All" && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add First Service
                </button>
              )}
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:gap-5">
              {paginatedServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  deleting={deletingId === service.id}
                  onEdit={() => openEditForm(service)}
                  onDelete={() => void removeService(service)}
                />
              ))}
            </section>
          )}

          {!loading && filteredServices.length > 0 && (
            <footer className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {(page - 1) * PAGE_SIZE + 1}
                </strong>
                –
                <strong className="text-slate-700 dark:text-slate-200">
                  {Math.min(page * PAGE_SIZE, filteredServices.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {filteredServices.length}
                </strong>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="min-w-24 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          )}
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:hidden"
          aria-label="Add service"
        >
          <Plus className="h-6 w-6" />
        </button>
      </main>

      {formOpen && (
        <ServiceFormModal
          editingService={editingService}
          form={form}
          errors={formErrors}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          onFieldChange={updateFormField}
          onSave={() => void saveService()}
          onReset={resetForm}
          onClose={() => void requestCloseForm()}
        />
      )}
    </WorkerLayout>
  );
}

function ServiceCard({
  service,
  deleting,
  onEdit,
  onDelete,
}: {
  service: WorkerService;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex max-w-full rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <span className="truncate">{service.category}</span>
          </span>

          <h2 className="mt-3 break-words text-xl font-black text-slate-900 dark:text-white">
            {service.service_name}
          </h2>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
            service.status,
          )}`}
        >
          {service.status === "Approved" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : service.status === "Rejected" ? (
            <CircleX className="h-3.5 w-3.5" />
          ) : (
            <Clock3 className="h-3.5 w-3.5" />
          )}

          {service.status}
        </span>
      </header>

      <p className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {service.description || "No description provided."}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {getPriceLabel(service.pricing_type)}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <PhilippinePeso className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(service.price)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            {service.scheduling_type === "project" ? "Project Duration" : "Service Duration"}
          </p>
          <p className="mt-1 font-black text-blue-900 dark:text-blue-100">
            {getDurationLabel(service)} · {getPricingLabel(service.pricing_type)}
          </p>
        </div>
      </div>

      {service.status === "Rejected" && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Edit and resubmit this service for administrator review.
        </div>
      )}

      <footer className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={deleting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:translate-y-0 disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:translate-y-0 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {deleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </button>
      </footer>
    </article>
  );
}

function ServiceFormModal({
  editingService,
  form,
  errors,
  saving,
  hasUnsavedChanges,
  onFieldChange,
  onSave,
  onReset,
  onClose,
}: {
  editingService: WorkerService | null;
  form: ServiceFormState;
  errors: FormErrors;
  saving: boolean;
  hasUnsavedChanges: boolean;
  onFieldChange: <K extends keyof ServiceFormState>(
    field: K,
    value: ServiceFormState[K],
  ) => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white shadow-2xl sm:rounded-[1.75rem] dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
              {editingService ? "Update Service" : "New Service"}
            </p>

            <h2
              id="service-form-title"
              className="mt-1 text-xl font-black text-slate-900 sm:text-2xl dark:text-white"
            >
              {editingService ? "Edit Service" : "Add a Service"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              New and updated services require administrator approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close service form"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 lg:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" error={errors.category}>
              <input
                type="text"
                list="service-categories"
                value={form.category}
                onChange={(event) =>
                  onFieldChange("category", event.target.value)
                }
                maxLength={100}
                disabled={saving}
                placeholder="Example: Plumbing"
                className={inputClassName(Boolean(errors.category))}
              />

              <datalist id="service-categories">
                {CATEGORY_SUGGESTIONS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>

              <CharacterCounter current={form.category.length} maximum={100} />
            </Field>

            <Field label="Service Name" error={errors.serviceName}>
              <input
                type="text"
                value={form.serviceName}
                onChange={(event) =>
                  onFieldChange("serviceName", event.target.value)
                }
                maxLength={150}
                disabled={saving}
                placeholder="Example: Faucet Repair"
                className={inputClassName(Boolean(errors.serviceName))}
              />

              <CharacterCounter
                current={form.serviceName.length}
                maximum={150}
              />
            </Field>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-900 dark:text-white">Scheduling</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose whether this is a short service or a longer project.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Scheduling Type">
                  <select value={form.schedulingType} onChange={(event) => onFieldChange("schedulingType", event.target.value as SchedulingType)} disabled={saving} className={inputClassName(false)}>
                    <option value="hourly">Hourly / Same-day</option>
                    <option value="project">Project / Multi-day</option>
                  </select>
                </Field>
                <Field label={form.schedulingType === "project" ? "Estimated Duration" : "Service Duration"} error={errors.durationValue}>
                  <input type="number" min="1" max="365" step="1" inputMode="numeric" value={form.durationValue} onChange={(event) => onFieldChange("durationValue", event.target.value)} disabled={saving} className={inputClassName(Boolean(errors.durationValue))} />
                </Field>
                <Field label="Duration Unit">
                  <select value={form.durationUnit} onChange={(event) => onFieldChange("durationUnit", event.target.value as DurationUnit)} disabled={saving} className={inputClassName(false)}>
                    <option value="hour">Hour(s)</option>
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <h3 className="font-black text-emerald-950 dark:text-emerald-100">Pricing</h3>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Pakyawan is one agreed total, Arawan is per working day, and Orasan is per hour.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Pricing Type">
                  <select value={form.pricingType} onChange={(event) => onFieldChange("pricingType", event.target.value as PricingType)} disabled={saving} className={inputClassName(false)}>
                    <option value="fixed">Pakyawan (Fixed Contract)</option>
                    <option value="daily">Arawan (Daily Rate)</option>
                    <option value="hourly">Orasan (Hourly Rate)</option>
                  </select>
                </Field>
                <Field label={getPriceLabel(form.pricingType)} error={errors.price}>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">₱</span>
                    <input type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => onFieldChange("price", event.target.value)} disabled={saving} placeholder="0.00" className={`${inputClassName(Boolean(errors.price))} pl-9`} />
                  </div>
                </Field>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
              Editing an approved service changes its status back to Pending so an administrator can review it again.
            </div>

            <div className="sm:col-span-2">
              <Field label="Description" error={errors.description}>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    onFieldChange("description", event.target.value)
                  }
                  maxLength={2_000}
                  rows={7}
                  disabled={saving}
                  placeholder="Describe the service, what is included, and any important customer requirements."
                  className={`${inputClassName(
                    Boolean(errors.description),
                  )} h-auto resize-y py-3`}
                />

                <CharacterCounter
                  current={form.description.length}
                  maximum={2_000}
                />
              </Field>
            </div>
          </div>
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-4 sm:flex sm:justify-end dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={onReset}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:min-w-36"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : editingService ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {saving ? "Saving..." : editingService ? "Save" : "Create"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
      </span>

      {children}

      {error && (
        <span className="mt-2 block text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </span>
      )}
    </label>
  );
}

function CharacterCounter({
  current,
  maximum,
}: {
  current: number;
  maximum: number;
}) {
  return (
    <span className="mt-1 block text-right text-xs text-slate-400">
      {current.toLocaleString()} / {maximum.toLocaleString()}
    </span>
  );
}

function inputClassName(hasError: boolean): string {
  return `h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 ${
    hasError
      ? "border-red-400 focus:ring-4 focus:ring-red-500/10 dark:focus:ring-red-500/10"
      : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:ring-blue-500/10"
  }`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  iconClassName: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            {value}
          </p>
        </div>

        <div className={`hidden rounded-xl p-2.5 shadow-sm sm:block ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}