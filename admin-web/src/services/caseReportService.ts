import { supabase } from "../lib/supabase";
import {
  ALLOWED_REPORT_EVIDENCE_MIME_TYPES,
  MAX_REPORT_EVIDENCE_FILES,
  MAX_REPORT_EVIDENCE_FILE_SIZE,
  REPORT_EVIDENCE_BUCKET,
  type CreateReportInput,
  type ReportCase,
  type ReportEvidence,
  type ReportLog,
} from "../types/report";

export interface ReportSubmissionFile {
  file: File;
  caption?: string;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function validateReportFiles(files: File[]): void {
  if (files.length > MAX_REPORT_EVIDENCE_FILES) {
    throw new Error(`You may upload up to ${MAX_REPORT_EVIDENCE_FILES} evidence files.`);
  }

  for (const file of files) {
    if (file.size <= 0 || file.size > MAX_REPORT_EVIDENCE_FILE_SIZE) {
      throw new Error(`${file.name} must be 5 MB or smaller.`);
    }

    if (!ALLOWED_REPORT_EVIDENCE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_REPORT_EVIDENCE_MIME_TYPES)[number],
    )) {
      throw new Error(`${file.name} must be JPG, PNG, WebP, or PDF.`);
    }
  }
}

export async function submitReportCase(
  input: CreateReportInput,
  files: File[] = [],
): Promise<ReportCase> {
  validateReportFiles(files);

  const { data, error } = await supabase
    .from("reports")
    .insert({
      ...input,
      requested_resolution: input.requested_resolution?.trim() || null,
      priority: input.priority ?? "medium",
    })
    .select("*")
    .single();

  if (error) throw error;

  const report = data as ReportCase;

  try {
    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const storagePath = `${input.reporter_id}/${report.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const upload = await supabase.storage
        .from(REPORT_EVIDENCE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (upload.error) throw upload.error;

      const metadata = await supabase.from("report_evidence").insert({
        report_id: report.id,
        uploaded_by: input.reporter_id,
        storage_bucket: REPORT_EVIDENCE_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      });

      if (metadata.error) {
        await supabase.storage.from(REPORT_EVIDENCE_BUCKET).remove([storagePath]);
        throw metadata.error;
      }
    }
  } catch (uploadError) {
    await supabase.from("reports").delete().eq("id", report.id);
    throw uploadError;
  }

  return report;
}

export async function getMyReports(): Promise<ReportCase[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("You must be signed in.");

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("reporter_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportCase[];
}

export async function getMyReportDetails(reportId: string): Promise<{
  report: ReportCase;
  evidence: Array<ReportEvidence & { signed_url: string | null }>;
  logs: ReportLog[];
}> {
  const [reportResult, evidenceResult, logsResult] = await Promise.all([
    supabase.from("reports").select("*").eq("id", reportId).single(),
    supabase.from("report_evidence").select("*").eq("report_id", reportId).order("created_at"),
    supabase.from("report_logs").select("*").eq("report_id", reportId).order("created_at"),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (evidenceResult.error) throw evidenceResult.error;
  if (logsResult.error) throw logsResult.error;

  const evidence = await Promise.all(
    ((evidenceResult.data ?? []) as ReportEvidence[]).map(async (item) => {
      const signed = await supabase.storage
        .from(item.storage_bucket)
        .createSignedUrl(item.storage_path, 3600);
      return { ...item, signed_url: signed.data?.signedUrl ?? null };
    }),
  );

  return {
    report: reportResult.data as ReportCase,
    evidence,
    logs: (logsResult.data ?? []) as ReportLog[],
  };
}

export async function getMyActiveReportCasesForBookings(
  bookingIds: number[],
): Promise<ReportCase[]> {
  const uniqueIds = [...new Set(bookingIds.filter(Number.isFinite))];

  if (!uniqueIds.length) {
    return [];
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("You must be signed in.");

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("reporter_id", authData.user.id)
    .in("booking_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const terminalStatuses = new Set([
    "resolved",
    "rejected",
    "withdrawn",
    "closed",
  ]);

  return ((data ?? []) as ReportCase[]).filter(
    (item) => !terminalStatuses.has(item.status),
  );
}

export function subscribeToMyReports(
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`my-report-cases-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reports", filter: `reporter_id=eq.${userId}` },
      onChange,
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
