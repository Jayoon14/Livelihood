import { auditCaughtError } from "../../lib/processAudit";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import {
  getMyReportDetails,
  getMyReports,
  respondToInformationRequest,
  subscribeToMyReports,
} from "../../services/caseReportService";
import type {
  ReportCase,
  ReportEvidence,
  ReportLog,
  ReportParticipantRole,
} from "../../types/report";
interface Props {
  role: ReportParticipantRole;
  layout: React.ComponentType<{ children: React.ReactNode }>;
}
type Details = {
  report: ReportCase;
  evidence: Array<ReportEvidence & { signed_url: string | null }>;
  logs: ReportLog[];
};
const labels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  needs_more_information: "Needs More Information",
  resolved: "Resolved",
  rejected: "Rejected",
  escalated: "Escalated",
  withdrawn: "Withdrawn",
  closed: "Closed",
};
function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-700";
  if (["rejected", "closed"].includes(status)) return "bg-red-100 text-red-700";
  if (["under_review", "escalated"].includes(status))
    return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}
function latestAdminRequest(logs: ReportLog[]) {
  return [...logs]
    .reverse()
    .find(
      (l) =>
        l.new_status === "needs_more_information" ||
        l.action === "information_requested",
    );
}
export default function MyReportsPage({ role, layout: Layout }: Props) {
  const [items, setItems] = useState<ReportCase[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<Details | null>(null),
    [detailsLoading, setDetailsLoading] = useState(false),
    [response, setResponse] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [sending, setSending] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      setItems(await getMyReports());
    } catch (e) {
      auditCaughtError(
        { module: "Reports", process: "load", action: "READ" },
        e,
      );
      setError(e instanceof Error ? e.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let cancelled = false,
      cleanup = () => {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      cleanup = subscribeToMyReports(data.user.id, () => {
        void load();
        const selectedId = selected?.report.id;
        if (selectedId) {
          void getMyReportDetails(selectedId)
            .then((fresh) => {
              if (!cancelled) setSelected(fresh);
            })
            .catch(() => {
              // The list refresh still runs; a manual reopen will retry details.
            });
        }
      });
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [load, selected?.report.id]);
  async function open(id: string) {
    setDetailsLoading(true);
    try {
      setSelected(await getMyReportDetails(id));
      setResponse("");
      setFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to open case.");
    } finally {
      setDetailsLoading(false);
    }
  }
  async function sendMore() {
    if (!selected) return;
    try {
      setSending(true);
      await respondToInformationRequest(selected.report.id, response, files);
      toast.success(
        "Additional information submitted. The case is back Under Review.",
      );
      const fresh = await getMyReportDetails(selected.report.id);
      setSelected(fresh);
      setResponse("");
      setFiles([]);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Unable to submit additional information.",
      );
    } finally {
      setSending(false);
    }
  }
  const request = selected ? latestAdminRequest(selected.logs) : undefined;
  return (
    <Layout>
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="mb-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Case Management</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">My Reports & Complaints</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              {role === "customer" ? "Track cases you submitted about a worker" : "Track cases you submitted about a customer"} and respond when the administrator asks for more information.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          </div>
          {!loading && !error && items.length > 0 && (
            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><FileText className="text-slate-500" size={20}/><div><p className="text-xs font-bold uppercase text-slate-400">Total cases</p><p className="text-lg font-black">{items.length}</p></div></div>
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3"><Clock3 className="text-amber-600" size={20}/><div><p className="text-xs font-bold uppercase text-amber-600">Needs response</p><p className="text-lg font-black text-amber-900">{items.filter((item) => item.status === "needs_more_information").length}</p></div></div>
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3"><CircleCheckBig className="text-emerald-600" size={20}/><div><p className="text-xs font-bold uppercase text-emerald-600">Resolved</p><p className="text-lg font-black text-emerald-900">{items.filter((item) => item.status === "resolved").length}</p></div></div>
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border bg-white p-12 text-center">
            <AlertTriangle className="mx-auto text-slate-400" size={44} />
            <h2 className="mt-4 text-xl font-black">No cases submitted</h2>
            <p className="mt-2 text-slate-500">
              Use Report User or File Complaint from a booking.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => void open(item.id)}
                className={`group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.status === "needs_more_information" ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <FileText />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black capitalize">
                      {item.case_type}: {item.subject}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}
                    >
                      {labels[item.status] ?? item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Case #{item.id.slice(0, 8)} · Booking #{item.booking_id} ·{" "}
                    {item.category}
                  </p>
                  {item.status === "needs_more_information" && (
                    <p className="mt-2 text-sm font-bold text-amber-700">
                      Action required: Admin is waiting for your response.
                    </p>
                  )}
                </div>
                <ChevronRight className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
        {detailsLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <Loader2 className="animate-spin text-white" size={36} />
          </div>
        )}
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
            <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(selected.report.status)}`}
                  >
                    {labels[selected.report.status] ?? selected.report.status}
                  </span>
                  <h2 className="mt-3 text-2xl font-black">
                    {selected.report.subject}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Case #{selected.report.id} · Booking #
                    {selected.report.booking_id}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X />
                </button>
              </div>
              <div className="mt-6 space-y-5">
                <section className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-black">Your statement</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selected.report.description}
                  </p>
                </section>
                {selected.report.status === "needs_more_information" && (
                  <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
                    <h3 className="text-lg font-black text-amber-900">
                      Admin needs more information
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      {request?.note ||
                        selected.report.resolution ||
                        "Please provide additional details or evidence for this case."}
                    </p>
                    <label className="mt-4 block text-sm font-bold">
                      Your response
                      <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-xl border border-amber-300 bg-white p-3"
                        placeholder="Explain the additional information requested by the administrator..."
                      />
                    </label>
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400 bg-white p-3 font-bold text-amber-800">
                      <Paperclip size={18} />
                      Add evidence (optional)
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          setFiles(Array.from(e.target.files ?? []))
                        }
                      />
                    </label>
                    {files.length > 0 && (
                      <p className="mt-2 text-xs text-amber-800">
                        {files.length} file(s) selected:{" "}
                        {files.map((f) => f.name).join(", ")}
                      </p>
                    )}
                    <button
                      disabled={sending || response.trim().length < 5}
                      onClick={() => void sendMore()}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} />
                      )}
                      Submit Additional Information
                    </button>
                    <p className="mt-2 text-xs text-amber-800">
                      After submission, status automatically returns to{" "}
                      <b>Under Review</b> and the admin is notified.
                    </p>
                  </section>
                )}
                {selected.report.resolution &&
                  ["resolved", "rejected", "closed"].includes(selected.report.status) && (
                    <section
                      className={`rounded-2xl p-5 ${selected.report.status === "rejected" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
                    >
                      <h3 className="font-black">
                        {selected.report.status === "rejected"
                          ? "Rejection reason"
                          : "Admin decision"}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap">
                        {selected.report.resolution}
                      </p>
                    </section>
                  )}
                <section>
                  <h3 className="font-black">Evidence</h3>
                  {selected.evidence.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      No evidence uploaded.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selected.evidence.map((e) => (
                        <a
                          key={e.id}
                          href={e.signed_url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border p-3 font-semibold hover:bg-slate-50"
                        >
                          {e.file_name}
                          {e.caption && (
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              {e.caption}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="font-black">Case timeline</h3>
                  <div className="mt-3 space-y-3">
                    {selected.logs.map((log) => (
                      <div
                        key={log.id}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <p className="font-bold capitalize">
                          {log.action.replaceAll("_", " ")}
                        </p>
                        <p className="text-sm text-slate-600">
                          {log.note ?? "Case activity recorded."}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString("en-PH")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
