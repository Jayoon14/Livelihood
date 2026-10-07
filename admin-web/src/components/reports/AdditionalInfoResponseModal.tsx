import { useEffect, useState } from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useSessionState } from "../../hooks/useSessionState";
import {
  getMyReportDetails,
  respondToInformationRequest,
} from "../../services/caseReportService";
import type { ReportCase, ReportEvidence, ReportLog } from "../../types/report";

type Details = {
  report: ReportCase;
  evidence: Array<ReportEvidence & { signed_url: string | null }>;
  logs: ReportLog[];
};

function latestRequest(details: Details) {
  return [...details.logs]
    .reverse()
    .find(
      (log) =>
        log.new_status === "needs_more_information" ||
        log.action === "information_requested",
    );
}

export default function AdditionalInfoResponseModal({
  caseId,
  onClose,
  onSubmitted,
}: {
  caseId: string;
  onClose: () => void;
  onSubmitted?: () => void | Promise<void>;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [response, setResponse, clearResponse] = useSessionState(
    `serbisyoGo.case.additionalInfo.${caseId}.v1`,
    "",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setLoading(true); });
    void getMyReportDetails(caseId)
      .then((value) => {
        if (active) setDetails(value);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to open the case request.",
        );
        onClose();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, onClose]);

  async function submit() {
    if (!details || response.trim().length < 5) return;
    try {
      setSending(true);
      await respondToInformationRequest(caseId, response, files);
      setResponse("");
      clearResponse();
      toast.success(
        "Additional information sent. Your case is back Under Review.",
      );
      await onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit additional information.",
      );
    } finally {
      setSending(false);
    }
  }

  const request = details ? latestRequest(details) : undefined;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-600">
              Additional Information Required
            </p>
            <h2 className="mt-1 text-xl font-black">
              Respond to Admin Request
            </h2>
            <p className="mt-1 text-xs text-slate-500">Case #{caseId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          details && (
            <div className="mt-5 space-y-4">
              {details.report.status !== "needs_more_information" ? (
                <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                  This request has already been answered or the case status has
                  changed. Current status:{" "}
                  {details.report.status.replaceAll("_", " ")}.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <FileText
                        className="mt-0.5 shrink-0 text-amber-700"
                        size={20}
                      />
                      <div>
                        <p className="font-black text-amber-900">
                          What the admin needs
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                          {request?.note ||
                            details.report.resolution ||
                            "Please provide the additional details or evidence requested for this case."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <label className="block text-sm font-bold text-slate-800">
                    Your explanation
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-blue-500"
                      placeholder="Explain the requested information clearly..."
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 font-bold text-slate-700 hover:bg-slate-50">
                    <Paperclip size={18} />
                    Upload additional evidence
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
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      {files.length} file(s):{" "}
                      {files.map((f) => f.name).join(", ")}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={sending || response.trim().length < 5}
                    onClick={() => void submit()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                    Submit Additional Information
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    This is added to the existing case. It does not create a new
                    report.
                  </p>
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
