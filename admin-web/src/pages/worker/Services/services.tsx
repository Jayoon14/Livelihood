import { confirmAction } from "../../../components/ui/confirmAction";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleCheck,
  CircleX,
  Clock3,
  Package,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  createService,
  deleteService,
  getMyServices,
  updateService,
} from "../../../services/serviceService";

type ServiceStatus = "Approved" | "Pending" | "Rejected";

interface WorkerService {
  id: number;
  category: string;
  service_name: string;
  description: string;
  price: number;
  status: ServiceStatus;
}

interface ServiceForm {
  category: string;
  serviceName: string;
  description: string;
  price: string;
}

interface FormErrors {
  category?: string;
  serviceName?: string;
  description?: string;
  price?: string;
}

const EMPTY_FORM: ServiceForm = {
  category: "",
  serviceName: "",
  description: "",
  price: "",
};

const STATUS_BADGE_CLASSES: Record<ServiceStatus, string> = {
  Approved: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700",
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function normalizeService(value: unknown): WorkerService | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const service = value as Record<string, unknown>;

  if (
    typeof service.id !== "number" ||
    typeof service.category !== "string" ||
    typeof service.service_name !== "string" ||
    typeof service.description !== "string"
  ) {
    return null;
  }

  const parsedPrice =
    typeof service.price === "number"
      ? service.price
      : Number(service.price);

  if (!Number.isFinite(parsedPrice)) {
    return null;
  }

  const status: ServiceStatus =
    service.status === "Approved" ||
    service.status === "Rejected"
      ? service.status
      : "Pending";

  return {
    id: service.id,
    category: service.category,
    service_name: service.service_name,
    description: service.description,
    price: parsedPrice,
    status,
  };
}

function validateForm(form: ServiceForm): FormErrors {
  const errors: FormErrors = {};

  const category = form.category.trim();
  const serviceName = form.serviceName.trim();
  const description = form.description.trim();
  const price = Number(form.price);

  if (!category) {
    errors.category = "Category is required.";
  } else if (category.length > 80) {
    errors.category = "Category must not exceed 80 characters.";
  }

  if (!serviceName) {
    errors.serviceName = "Service name is required.";
  } else if (serviceName.length > 120) {
    errors.serviceName = "Service name must not exceed 120 characters.";
  }

  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length > 500) {
    errors.description = "Description must not exceed 500 characters.";
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

export default function Services() {
  const [services, setServices] = useState<WorkerService[]>([]);
  const [editingService, setEditingService] =
    useState<WorkerService | null>(null);

  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"All" | ServiceStatus>("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const data = await getMyServices(user.id);
      const normalized = Array.isArray(data)
        ? data
            .map(normalizeService)
            .filter((service): service is WorkerService => service !== null)
        : [];

      setServices(normalized);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load your services."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const updateFormField = useCallback(
    (field: keyof ServiceForm, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

      setFormErrors((current) => ({
        ...current,
        [field]: undefined,
      }));

      clearMessages();
    },
    [clearMessages],
  );

  const clearForm = useCallback(() => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    clearMessages();
  }, [clearMessages]);

  const editService = useCallback(
    (service: WorkerService) => {
      setEditingService(service);
      setForm({
        category: service.category,
        serviceName: service.service_name,
        description: service.description,
        price: String(service.price),
      });
      setFormErrors({});
      clearMessages();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [clearMessages],
  );

  const saveService = useCallback(async () => {
    if (saving) {
      return;
    }

    const errors = validateForm(form);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage("Please correct the highlighted fields.");
      setSuccessMessage("");
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const payload = {
        category: form.category.trim(),
        service_name: form.serviceName.trim(),
        description: form.description.trim(),
        price: Number(form.price),
      };

      if (editingService) {
        await updateService(editingService.id, payload);
        setSuccessMessage("Service updated successfully.");
      } else {
        await createService(user.id, payload);
        setSuccessMessage("Service created successfully.");
      }

      setEditingService(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      await loadServices();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to save the service."),
      );
    } finally {
      setSaving(false);
    }
  }, [
    clearMessages,
    editingService,
    form,
    loadServices,
    saving,
  ]);

  const removeService = useCallback(
    async (id: number) => {
      if (deletingId !== null) {
        return;
      }

      const confirmed = await confirmAction(
        "Are you sure you want to delete this service?",
      );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(id);
        clearMessages();

        await deleteService(id);

        setServices((current) =>
          current.filter((service) => service.id !== id),
        );

        if (editingService?.id === id) {
          setEditingService(null);
          setForm(EMPTY_FORM);
          setFormErrors({});
        }

        setSuccessMessage("Service deleted successfully.");
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Unable to delete the service."),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [clearMessages, deletingId, editingService],
  );

  const statistics = useMemo(() => {
    return services.reduce(
      (totals, service) => {
        totals.total += 1;
        totals[service.status] += 1;
        return totals;
      },
      {
        total: 0,
        Approved: 0,
        Pending: 0,
        Rejected: 0,
      },
    );
  }, [services]);

  const filteredServices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        !keyword ||
        service.category.toLowerCase().includes(keyword) ||
        service.service_name.toLowerCase().includes(keyword) ||
        service.description.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" || service.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, services, statusFilter]);

  const groupedServices = useMemo(() => {
    return filteredServices.reduce<Record<string, WorkerService[]>>(
      (groups, service) => {
        const category = service.category.trim() || "Uncategorized";

        if (!groups[category]) {
          groups[category] = [];
        }

        groups[category].push(service);
        return groups;
      },
      {},
    );
  }, [filteredServices]);

  const groupedEntries = useMemo(
    () =>
      Object.entries(groupedServices).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    [groupedServices],
  );

  return (
    <WorkerLayout>
      <div className="mx-auto w-full max-w-[1800px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            My Services
          </h1>
          <p className="mt-2 text-slate-500">
            Manage and update the services you offer to customers.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Services",
              value: statistics.total,
              icon: Package,
              iconClass: "text-blue-600",
              valueClass: "text-blue-600",
            },
            {
              label: "Approved",
              value: statistics.Approved,
              icon: CircleCheck,
              iconClass: "text-green-600",
              valueClass: "text-green-600",
            },
            {
              label: "Pending",
              value: statistics.Pending,
              icon: Clock3,
              iconClass: "text-yellow-500",
              valueClass: "text-yellow-500",
            },
            {
              label: "Rejected",
              value: statistics.Rejected,
              icon: CircleX,
              iconClass: "text-red-600",
              valueClass: "text-red-600",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.label}
                    </p>
                    <p
                      className={`mt-2 text-4xl font-bold ${item.valueClass}`}
                    >
                      {item.value}
                    </p>
                  </div>
                  <Icon size={44} className={item.iconClass} />
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {editingService ? "Edit Service" : "Add New Service"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingService
                ? "Update the selected service information."
                : "Create a new service for customer bookings."}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Category
              </span>
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  updateFormField("category", event.target.value)
                }
                disabled={saving}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  formErrors.category
                    ? "border-red-400 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
                placeholder="Example: Home Repair"
              />
              {formErrors.category && (
                <p className="mt-2 text-sm text-red-600">
                  {formErrors.category}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Service Name
              </span>
              <input
                type="text"
                value={form.serviceName}
                onChange={(event) =>
                  updateFormField("serviceName", event.target.value)
                }
                disabled={saving}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  formErrors.serviceName
                    ? "border-red-400 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
                placeholder="Example: Faucet Repair"
              />
              {formErrors.serviceName && (
                <p className="mt-2 text-sm text-red-600">
                  {formErrors.serviceName}
                </p>
              )}
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateFormField("description", event.target.value)
                }
                disabled={saving}
                rows={4}
                className={`w-full resize-y rounded-xl border px-4 py-3 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  formErrors.description
                    ? "border-red-400 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
                placeholder="Describe what is included in this service."
              />
              <div className="mt-2 flex items-center justify-between gap-4">
                {formErrors.description ? (
                  <p className="text-sm text-red-600">
                    {formErrors.description}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-500">
                  {form.description.length}/500
                </p>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Starting Price
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                  ₱
                </span>
                <input
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    updateFormField("price", event.target.value)
                  }
                  disabled={saving}
                  className={`w-full rounded-xl border py-3 pl-9 pr-4 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    formErrors.price
                      ? "border-red-400 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
                  placeholder="0.00"
                />
              </div>
              {formErrors.price && (
                <p className="mt-2 text-sm text-red-600">
                  {formErrors.price}
                </p>
              )}
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void saveService()}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? editingService
                  ? "Updating..."
                  : "Adding..."
                : editingService
                  ? "Update Service"
                  : "Add Service"}
            </button>

            {editingService && (
              <button
                type="button"
                onClick={clearForm}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "All" | ServiceStatus,
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:w-56"
            >
              <option value="All">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : groupedEntries.length > 0 ? (
            <div className="space-y-10">
              {groupedEntries.map(([categoryName, categoryServices]) => (
                <div key={categoryName}>
                  <h2 className="mb-5 text-2xl font-bold text-slate-900">
                    {categoryName}
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {categoryServices.map((service) => (
                      <article
                        key={service.id}
                        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="break-words text-xl font-bold text-slate-900">
                              {service.service_name}
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                              {service.description}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                              STATUS_BADGE_CLASSES[service.status]
                            }`}
                          >
                            {service.status}
                          </span>
                        </div>

                        <div className="mt-auto pt-6">
                          <p className="text-sm text-slate-400">
                            Starting Price
                          </p>
                          <p className="mt-1 text-3xl font-bold text-blue-600">
                            ₱
                            {service.price.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>

                          <div className="mt-6 flex gap-3">
                            <button
                              type="button"
                              onClick={() => editService(service)}
                              disabled={saving || deletingId !== null}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-500 py-2.5 font-semibold text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <SquarePen size={18} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void removeService(service.id)
                              }
                              disabled={saving || deletingId !== null}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={18} />
                              {deletingId === service.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="text-7xl" aria-hidden="true">
                🛠️
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                {services.length === 0
                  ? "No Services Yet"
                  : "No Matching Services"}
              </h2>
              <p className="mt-2 text-slate-500">
                {services.length === 0
                  ? "Create your first service and start accepting bookings."
                  : "Try changing your search keyword or status filter."}
              </p>
            </div>
          )}
        </section>
      </div>
    </WorkerLayout>
  );
}