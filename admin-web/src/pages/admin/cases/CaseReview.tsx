import { auditCaughtError, auditUiError } from "../../../lib/processAudit";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  LoaderCircle,
  MessageSquareMore,
  MessageSquareWarning,
  Save,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../../layouts/AdminLayout";
import {
  decideAdminCase,
  getAdminCaseDetails,
  getCasePersonName,
  issueCaseWarning,
  requestCaseInformation,
  suspendReportedUser,
  updateAdminCase,
  type AdminCaseDetails,
  type CasePerson,
} from "../../../services/adminCaseReportService";
import type { ReportPriority } from "../../../types/report";

const format = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const terminal = new Set(["resolved", "rejected", "closed", "withdrawn"]);

export default function CaseReview() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminCaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priority, setPriority] = useState<ReportPriority>("medium");
  const [notes, setNotes] = useState("");
  const [publicText, setPublicText] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const value = await getAdminCaseDetails(reportId);
      setData(value);
      setPriority(value.report.priority);
      setNotes(value.report.admin_notes ?? "");
      setPublicText(terminal.has(value.report.status) ? "" : (value.report.resolution ?? ""));
    } catch (e) {
      auditCaughtError(
        { module: "Reports", process: "load case", action: "READ" },
        e,
      );
      auditUiError(
        { module: "Reports", process: "load case", action: "READ" },
        toast.error,
        e instanceof Error ? e.message : "Unable to load case.",
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, success: string) {
    try {
      setSaving(true);
      await action();
      toast.success(success);
      await load();
    } catch (e) {
      auditCaughtError(
        { module: "Reports", process: "case decision", action: "UPDATE" },
        e,
      );
      toast.error(e instanceof Error ? e.message : "Unable to update case.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoaderCircle className="animate-spin text-blue-600" size={40} />
        </div>
      </AdminLayout>
    );
  if (!data)
    return (
      <AdminLayout>
        <div className="rounded-2xl border bg-white p-10 text-center">
          Case not found.
        </div>
      </AdminLayout>
    );
  const r = data.report;
  const isTerminal = terminal.has(r.status);
  const canPenalize = r.status === "resolved";

  const requestInfo = () =>
    run(
      () => requestCaseInformation(r.id, publicText, priority, notes),
      "Information request sent to the reporter.",
    );
  const startReview = () =>
    run(
      () =>
        updateAdminCase({
          reportId: r.id,
          status: "under_review",
          priority,
          adminNotes: notes,
          resolution: "",
        }),
      "Case moved to Under Review.",
    );
  const saveNotes = () =>
    run(
      () =>
        updateAdminCase({
          reportId: r.id,
          status: r.status,
          priority,
          adminNotes: notes,
          resolution: r.resolution ?? "",
        }),
      "Internal review saved.",
    );
  const decide = (decision: "resolved" | "rejected") =>
    run(
      () =>
        decideAdminCase({
          reportId: r.id,
          decision,
          explanation: publicText,
          priority,
          adminNotes: notes,
        }),
      decision === "resolved"
        ? "Case resolved and both parties were notified."
        : "Case rejected and both parties were notified.",
    );
  const warning = async () => {
    const message = window.prompt(
      "Warning reason (shown to the reported user):",
    );
    if (!message) return;
    await run(
      () => issueCaseWarning(r.id, r.reported_user_id, r.booking_id, message),
      "Warning issued. The user can appeal this enforcement action.",
    );
  };
  const suspend = async () => {
    const reason = window.prompt("Suspension reason (7 days):");
    if (
      !reason ||
      !window.confirm("Apply a 7-day suspension to the reported user?")
    )
      return;
    await run(
      () => suspendReportedUser(r.id, r.reported_user_id, reason),
      "Suspension issued. The user can appeal this enforcement action.",
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/cases")}
          className="inline-flex items-center gap-2 font-bold text-slate-600"
        >
          <ArrowLeft size={18} />
          Back to cases
        </button>
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">
                {r.case_type} · Booking #{r.booking_id}
              </p>
              <h1 className="mt-2 text-3xl font-black">{r.subject}</h1>
              <p className="mt-2 text-slate-300">Case #{r.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-4 py-2 font-bold capitalize">
                {r.priority} priority
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 font-bold capitalize">
                {r.status.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <Info className="mr-2 inline" size={18} />
          <b>Case flow:</b> Submitted → Under Review → Request More Information
          (when needed) → reporter responds → Under Review → Resolve or Reject.
          Penalties are applied only after a resolved case.
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <ShieldAlert className="text-blue-600" />
                Case statement
              </h2>
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Category
                </p>
                <p className="mt-1 font-bold">{r.category}</p>
                <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">
                  {r.description}
                </p>
                {r.requested_resolution && (
                  <>
                    <p className="mt-5 text-xs font-bold uppercase text-slate-500">
                      Requested resolution
                    </p>
                    <p className="mt-1">{r.requested_resolution}</p>
                  </>
                )}
              </div>
            </section>
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <UserRound className="text-blue-600" />
                Participants
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["Reporter", r.reporter],
                    ["Reported User", r.reported_user],
                  ] as Array<[string, CasePerson | null]>
                ).map(([label, p]) => (
                  <div key={label} className="rounded-2xl border p-5">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-black">
                      {getCasePersonName(p)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {p?.email ?? "No email"}
                    </p>
                    <p className="mt-3 text-sm capitalize">
                      Role: {p?.role ?? "—"} · Account: {p?.status ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <FileText className="text-blue-600" />
                Evidence ({data.evidence.length})
              </h2>
              {data.evidence.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-slate-500">
                  No evidence uploaded yet.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {data.evidence.map((e) => (
                    <a
                      key={e.id}
                      href={e.signed_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border p-4 hover:border-blue-400"
                    >
                      <p className="truncate font-bold">{e.file_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {e.caption ||
                          `${e.mime_type} · ${(e.file_size / 1024).toFixed(1)} KB`}
                      </p>
                      <ExternalLink size={18} className="mt-2 text-blue-600" />
                    </a>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Case timeline</h2>
              <div className="mt-5 space-y-4">
                {data.logs.length === 0 ? (
                  <p className="text-slate-500">No case activity yet.</p>
                ) : (
                  data.logs.map((log) => (
                    <div
                      key={log.id}
                      className="relative border-l-2 border-blue-200 pl-5"
                    >
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600" />
                      <p className="font-bold capitalize">
                        {log.action.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {log.note ?? "Case activity recorded."}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {format(log.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm xl:sticky xl:top-6">
              <h2 className="text-xl font-black">Case actions</h2>
              <p className="mt-2 text-sm text-slate-500">
                Use the action that matches the investigation. Status changes
                automatically.
              </p>
              <label className="mt-5 block text-sm font-bold">
                Priority
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as ReportPriority)
                  }
                  disabled={isTerminal}
                  className="mt-2 w-full rounded-xl border px-4 py-3 disabled:bg-slate-100"
                >
                  {["low", "medium", "high", "urgent"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold">
                Private admin notes{" "}
                <span className="font-normal text-slate-400">(admin only)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  disabled={isTerminal}
                  className="mt-2 w-full rounded-xl border p-3 disabled:bg-slate-100"
                  placeholder="Investigation notes, checks performed, internal observations..."
                />
              </label>
              {!isTerminal && (
                <button
                  disabled={saving}
                  onClick={saveNotes}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold"
                >
                  <Save size={18} />
                  Save Internal Review
                </button>
              )}
              {r.status === "submitted" && (
                <button
                  disabled={saving}
                  onClick={startReview}
                  className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
                >
                  Start Review
                </button>
              )}
              {!isTerminal && r.status !== "submitted" && (
                <>
                  <label className="mt-5 block text-sm font-bold">
                    Message / public decision
                    <textarea
                      value={publicText}
                      onChange={(e) => setPublicText(e.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border p-3"
                      placeholder={
                        r.status === "needs_more_information"
                          ? "The reporter is currently preparing a response..."
                          : "Explain what information is needed, or write the final resolution/rejection reason."
                      }
                    />
                  </label>
                  <button
                    disabled={saving}
                    onClick={requestInfo}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-bold text-amber-800"
                  >
                    <MessageSquareMore size={18} />
                    Request More Information
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={saving}
                      onClick={() => void decide("resolved")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white"
                    >
                      <CheckCircle2 size={17} />
                      Resolve
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => void decide("rejected")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white"
                    >
                      <XCircle size={17} />
                      Reject
                    </button>
                  </div>
                </>
              )}
              {r.status === "needs_more_information" && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  <b>Waiting for reporter.</b> The customer/worker will see a
                  Respond to Request form in My Reports. After submission, the
                  case automatically returns to Under Review.
                </div>
              )}
              {isTerminal && (
                <>
                  <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
                    <b>Final decision:</b>
                    <p className="mt-2 whitespace-pre-wrap">
                      {r.resolution || "No public explanation recorded."}
                    </p>
                  </div>
                  {(r.status === "resolved" || r.status === "rejected") && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-black text-amber-900">Reopen case for more information</p>
                      <p className="mt-1 text-xs text-amber-800">
                        This changes the case to Needs More Information and lets the reporter respond again.
                      </p>
                      <textarea
                        value={publicText}
                        onChange={(e) => setPublicText(e.target.value)}
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm"
                        placeholder="Explain exactly what additional information or evidence is needed..."
                      />
                      <button
                        disabled={saving || publicText.trim().length < 10}
                        onClick={requestInfo}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                      >
                        <MessageSquareMore size={18} />
                        Reopen & Request More Information
                      </button>
                    </div>
                  )}
                </>
              )}
              {canPenalize && (
                <>
                  <div className="my-5 border-t" />
                  <p className="text-sm font-black">
                    Optional enforcement after resolution
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    A warning/suspension creates an appealable enforcement
                    action.
                  </p>
                  <button
                    onClick={() => void warning()}
                    disabled={saving}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-bold text-amber-800"
                  >
                    <MessageSquareWarning size={18} />
                    Issue Warning
                  </button>
                  <button
                    onClick={() => void suspend()}
                    disabled={saving}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 font-bold text-rose-800"
                  >
                    <Ban size={18} />
                    7-Day Suspension
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    <AlertTriangle size={14} className="mr-1 inline" />
                    The affected user can appeal from My Appeals.
                  </p>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
