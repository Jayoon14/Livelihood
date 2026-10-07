import { auditUiError, auditCaughtError } from "../../../lib/processAudit";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, RefreshCw, Search, X, } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode, } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import { getAdminServices, SERVICE_STATUS, type AdminService, type ServiceStatus, } from "../../../services/serviceService";
import { getAdminSlotRequests, reviewServiceSlotRequest, type ServiceSlotRequest } from "../../../services/serviceSlotRequestService";
const PAGE_SIZE = 10;
type StatusFilter = "All" | ServiceStatus;
type SortOption = "Newest" | "Oldest" | "Service A-Z" | "Category A-Z" | "Worker A-Z" | "Highest Price" | "Lowest Price";
const STATUS_OPTIONS: StatusFilter[] = [
    "All",
    SERVICE_STATUS.PENDING,
    SERVICE_STATUS.APPROVED,
    SERVICE_STATUS.REJECTED,
];
function formatMoney(value: number): string {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
    }).format(value);
}
function statusClass(status: ServiceStatus): string {
    switch (status) {
        case SERVICE_STATUS.APPROVED:
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
        case SERVICE_STATUS.REJECTED:
            return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
        default:
            return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    }
}
function csvEscape(value: unknown): string {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
export default function Services() {
    const [services, setServices] = useState<AdminService[]>([]);
    const [slotRequests, setSlotRequests] = useState<ServiceSlotRequest[]>([]);
    const [slotProcessingId, setSlotProcessingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
    const [sortOption, setSortOption] = useState<SortOption>("Newest");
    const [page, setPage] = useState(1);
    const [selectedService, setSelectedService] = useState<AdminService | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const loadServices = useCallback(async (background = false) => {
        if (background) {
            setRefreshing(true);
        }
        else {
            setLoading(true);
        }
        setError("");
        try {
            const [serviceRows, requestRows] = await Promise.all([getAdminServices(), getAdminSlotRequests()]);
            setServices(serviceRows);
            setSlotRequests(requestRows);
        }
        catch (caught) {
            auditCaughtError({ module: "Services", process: "background operation", action: "EXECUTE" }, caught);
            const message = caught instanceof Error
                ? caught.message
                : "Unable to load service requests.";
            setError(message);
            if (!background) {
                auditUiError({ module: "Services", process: "validation", action: "EXECUTE" }, toast.error, message);
            }
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadServices();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadServices]);
    useEffect(() => {
        const channel = supabase
            .channel("admin-services-page")
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "services",
        }, () => {
            void loadServices(true);
        })
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [loadServices]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [search, statusFilter, sortOption]);
    useEffect(() => {
        if (!selectedService) {
            return;
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setSelectedService(null);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [selectedService]);
    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = services.filter((service) => {
            const matchesStatus = statusFilter === "All" ||
                service.status === statusFilter;
            const haystack = [
                service.worker_name,
                service.worker?.email,
                service.category,
                service.service_name,
                service.description,
                service.status,
                service.price,
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();
            return (matchesStatus &&
                (!query || haystack.includes(query)));
        });
        return [...filtered].sort((first, second) => {
            switch (sortOption) {
                case "Oldest":
                    return first.id - second.id;
                case "Service A-Z":
                    return first.service_name.localeCompare(second.service_name);
                case "Category A-Z":
                    return first.category.localeCompare(second.category);
                case "Worker A-Z":
                    return first.worker_name.localeCompare(second.worker_name);
                case "Highest Price":
                    return second.price - first.price;
                case "Lowest Price":
                    return first.price - second.price;
                case "Newest":
                default:
                    return second.id - first.id;
            }
        });
    }, [
        search,
        services,
        sortOption,
        statusFilter,
    ]);
    const summary = useMemo(() => {
        const categories = new Set<string>();
        const workers = new Set<string>();
        const result = {
            total: services.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            categories: 0,
            workers: 0,
        };
        for (const service of services) {
            categories.add(service.category.trim());
            workers.add(service.worker_id);
            if (service.status === SERVICE_STATUS.PENDING) {
                result.pending += 1;
            }
            else if (service.status === SERVICE_STATUS.APPROVED) {
                result.approved += 1;
            }
            else {
                result.rejected += 1;
            }
        }
        result.categories = categories.size;
        result.workers = workers.size;
        return result;
    }, [services]);
    const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginatedServices = filteredServices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    async function reviewSlot(request: ServiceSlotRequest, approve: boolean) {
        let note = "";
        if (!approve) { note = window.prompt("Reason for rejecting this service slot request:")?.trim() ?? ""; if (!note) return; }
        const confirmed = await confirmAction(`${approve ? "Approve" : "Reject"} ${request.worker_name ?? "this worker"}'s request to increase the service limit to ${request.requested_limit}?`, { title: approve ? "Approve additional slot" : "Reject additional slot", confirmText: approve ? "Approve" : "Reject" });
        if (!confirmed) return;
        setSlotProcessingId(request.id);
        try { const updated = await reviewServiceSlotRequest(request, approve, note); setSlotRequests((rows)=>rows.map((r)=>r.id===request.id ? {...r,...updated} : r)); toast.success(approve ? "Additional service slot approved." : "Service slot request rejected."); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Unable to review request."); }
        finally { setSlotProcessingId(null); }
    }
    function exportCsv() {
        if (filteredServices.length === 0) {
            toast.warning("There are no services to export.");
            return;
        }
        const headers = [
            "Service ID",
            "Worker ID",
            "Worker",
            "Worker Email",
            "Category",
            "Service Name",
            "Description",
            "Price",
            "Status",
        ];
        const rows = filteredServices.map((service) => [
            service.id,
            service.worker_id,
            service.worker_name,
            service.worker?.email ?? "",
            service.category,
            service.service_name,
            service.description ?? "",
            service.price,
            service.status,
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
        anchor.download = `services-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        toast.success("Services CSV exported.");
    }
    function resetFilters() {
        setSearch("");
        setStatusFilter("All");
        setSortOption("Newest");
    }
    return (<AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Services Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review and manage services submitted by workers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <Download className="h-4 w-4"/>
              Export CSV
            </button>

            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <FileText className="h-4 w-4"/>
              Print / PDF
            </button>

            <button type="button" onClick={() => void loadServices(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Total Services" value={summary.total}/>
          <SummaryCard title="Pending" value={summary.pending}/>
          <SummaryCard title="Approved" value={summary.approved}/>
          <SummaryCard title="Rejected" value={summary.rejected}/>
          <SummaryCard title="Categories" value={summary.categories}/>
          <SummaryCard title="Workers" value={summary.workers}/>
        </section>

        {slotRequests.some((request) => request.status === "Pending") && (<section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20 print:hidden">
          <div className="mb-3"><h2 className="font-black text-slate-900 dark:text-white">Additional Service Slot Requests</h2><p className="text-sm text-slate-600 dark:text-slate-300">Workers normally have 5 service slots. Review requests for an additional slot here.</p></div>
          <div className="grid gap-3">{slotRequests.filter((request)=>request.status === "Pending").map((request)=><article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-black text-slate-900 dark:text-white">{request.worker_name}</p><p className="text-xs text-slate-500">{request.worker_email}</p><p className="mt-2 text-sm text-slate-700 dark:text-slate-200"><b>{request.current_limit}/{request.current_limit}</b> current slots → requesting <b>{request.requested_limit}</b></p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Reason: {request.reason}</p></div><div className="flex gap-2"><button disabled={slotProcessingId===request.id} onClick={()=>void reviewSlot(request,false)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Reject</button><button disabled={slotProcessingId===request.id} onClick={()=>void reviewSlot(request,true)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Approve</button></div></div></article>)}</div>
        </section>)}

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_190px_190px_auto] dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search worker, category, service, description, or price..." className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700"/>
          </label>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {STATUS_OPTIONS.map((status) => (<option key={status} value={status}>
                {status === "All"
                ? "All statuses"
                : status}
              </option>))}
          </select>

          <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <option>Newest</option>
            <option>Oldest</option>
            <option>Service A-Z</option>
            <option>Category A-Z</option>
            <option>Worker A-Z</option>
            <option>Highest Price</option>
            <option>Lowest Price</option>
          </select>

          <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Reset
          </button>
        </section>

        {loading ? (<StateCard text="Loading services..."/>) : error ? (<div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6 lg:p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>
            <button type="button" onClick={() => void loadServices()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
              Try again
            </button>
          </div>) : paginatedServices.length === 0 ? (<StateCard text="No service requests found."/>) : (<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-287.5 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedServices.map((service) => {
                return (<tr key={service.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-4">
                          <Link to={`/workers/${service.worker_id}`} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline dark:text-white">
                            {service.worker_name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {service.worker?.email ||
                        service.worker_id}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                          {service.category || "—"}
                        </td>

                        <td className="px-4 py-4 font-medium">
                          {service.service_name || "—"}
                        </td>

                        <td className="max-w-80 px-4 py-4 text-slate-600 dark:text-slate-300">
                          <p className="line-clamp-2">
                            {service.description ||
                        "No description"}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {formatMoney(service.price)}
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(service.status)}`}>
                            {service.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 print:hidden">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setSelectedService(service)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                              <Eye className="h-4 w-4"/>
                              View
                            </button>

                          </div>
                        </td>
                      </tr>);
            })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700 print:hidden">
              <p className="text-slate-500">
                Showing{" "}
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredServices.length)}{" "}
                of {filteredServices.length}
              </p>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700" aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4"/>
                </button>

                <span className="font-medium">
                  Page {safePage} of {totalPages}
                </span>

                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700" aria-label="Next page">
                  <ChevronRight className="h-4 w-4"/>
                </button>
              </div>
            </div>
          </section>)}
      </div>

      {selectedService && (<ServiceModal service={selectedService} onClose={() => setSelectedService(null)}/>)}
    </AdminLayout>);
}
function SummaryCard({ title, value, }: {
    title: string;
    value: number;
}) {
    return (<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>);
}
function StateCard({ text }: {
    text: string;
}) {
    return (<div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 lg:p-12 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {text}
    </div>);
}
function Detail({ label, value, }: {
    label: string;
    value: ReactNode;
}) {
    return (<div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 wrap-break-word font-semibold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>);
}
function ServiceModal({ service, onClose, }: {
    service: AdminService;
    onClose: () => void;
}) {
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        }}>
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service #{service.id}
            </p>
            <h2 id="service-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Service Details
            </h2>
          </div>

          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close service details">
            <X className="h-5 w-5"/>
          </button>
        </header>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <Detail label="Worker" value={<Link to={`/workers/${service.worker_id}`} className="text-blue-600 hover:underline">
                {service.worker_name}
              </Link>}/>
          <Detail label="Worker email" value={service.worker?.email || "Not available"}/>
          <Detail label="Category" value={service.category}/>
          <Detail label="Service name" value={service.service_name}/>
          <Detail label="Price" value={formatMoney(service.price)}/>
          <Detail label="Status" value={<span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(service.status)}`}>
                {service.status}
              </span>}/>

          <div className="sm:col-span-2">
            <Detail label="Description" value={service.description ||
            "No description provided."}/>
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            Close
          </button>

        </footer>
      </section>
    </div>);
}
