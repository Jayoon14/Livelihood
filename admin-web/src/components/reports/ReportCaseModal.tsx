import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { submitReportCase } from "../../services/caseReportService";
import {
  CUSTOMER_REPORT_CATEGORIES,
  WORKER_REPORT_CATEGORIES,
  MAX_REPORT_EVIDENCE_FILES,
  type ReportCaseType,
  type ReportParticipantRole,
} from "../../types/report";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  reportedUserId: string;
  reporterRole: ReportParticipantRole;
  reportedRole: ReportParticipantRole;
  reportedUserName: string;
  defaultCaseType?: ReportCaseType;
  onSubmitted?: () => void;
}

export default function ReportCaseModal({
  open, onClose, bookingId, reportedUserId, reporterRole, reportedRole,
  reportedUserName, defaultCaseType = "complaint", onSubmitted,
}: Props) {
  const [caseType, setCaseType] = useState<ReportCaseType>(defaultCaseType);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requestedResolution, setRequestedResolution] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(
    () => reporterRole === "customer" ? CUSTOMER_REPORT_CATEGORIES : WORKER_REPORT_CATEGORIES,
    [reporterRole],
  );

  useEffect(() => {
    if (!open) return;
    setCaseType(defaultCaseType);
    setCategory(""); setSubject(""); setDescription("");
    setRequestedResolution(""); setFiles([]);
  }, [defaultCaseType, open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!category || subject.trim().length < 5 || description.trim().length < 20) {
      toast.error("Complete the category, subject, and detailed description.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("You must be signed in.");

      await submitReportCase({
        booking_id: bookingId,
        reporter_id: data.user.id,
        reported_user_id: reportedUserId,
        reporter_role: reporterRole,
        reported_role: reportedRole,
        case_type: caseType,
        category,
        subject: subject.trim(),
        description: description.trim(),
        requested_resolution: requestedResolution.trim() || null,
        priority: "medium",
      }, files);

      toast.success(`${caseType === "report" ? "Report" : "Complaint"} submitted successfully.`);
      onSubmitted?.(); onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit the case.";
      toast.error(message.includes("reports_one_active_case_idx")
        ? "You already have an active case for this booking and user."
        : message);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600"><AlertTriangle size={22}/></div>
            <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Report or Complaint</h2><p className="text-sm text-slate-500">Against {reportedUserName} · Booking #{bookingId}</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X/></button>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3">
            {(["complaint", "report"] as ReportCaseType[]).map(value => (
              <button key={value} type="button" onClick={() => setCaseType(value)} className={`rounded-2xl border px-4 py-4 text-sm font-bold capitalize ${caseType === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{value}</button>
            ))}
          </div>

          <label className="block"><span className="mb-2 block text-sm font-bold">Category</span><select required value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"><option value="">Select category</option>{categories.map(item=><option key={item}>{item}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Subject</span><input required minLength={5} maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-800" placeholder="Brief summary of the issue"/></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Detailed description</span><textarea required minLength={20} maxLength={5000} rows={6} value={description} onChange={e=>setDescription(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-800" placeholder="Explain what happened, when it happened, and important details."/><span className="mt-1 block text-right text-xs text-slate-400">{description.length}/5000</span></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Requested resolution (optional)</span><input value={requestedResolution} onChange={e=>setRequestedResolution(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-800" placeholder="Example: payment review, warning, investigation"/></label>

          <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><Paperclip size={18}/>Add evidence<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e=>{const selected=Array.from(e.target.files??[]);setFiles(current=>[...current,...selected].slice(0,MAX_REPORT_EVIDENCE_FILES));e.currentTarget.value="";}}/></label>
            <p className="mt-2 text-center text-xs text-slate-500">Up to {MAX_REPORT_EVIDENCE_FILES} files, 5 MB each. JPG, PNG, WebP, or PDF.</p>
            {files.length>0 && <div className="mt-3 space-y-2">{files.map((file,index)=><div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><FileText size={17}/><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><button type="button" onClick={()=>setFiles(items=>items.filter((_,i)=>i!==index))} className="text-red-600"><X size={17}/></button></div>)}</div>}
          </div>
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:px-7"><button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-300 px-4 py-3 font-bold">Cancel</button><button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-60">{submitting&&<Loader2 className="animate-spin" size={18}/>}Submit Case</button></div>
      </form>
    </div>
  );
}
