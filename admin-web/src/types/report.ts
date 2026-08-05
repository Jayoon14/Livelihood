export const REPORT_CASE_TYPES = [
  "report",
  "complaint",
] as const;

export type ReportCaseType =
  (typeof REPORT_CASE_TYPES)[number];

export const REPORT_STATUSES = [
  "submitted",
  "under_review",
  "needs_more_information",
  "resolved",
  "rejected",
  "escalated",
  "withdrawn",
  "closed",
] as const;

export type ReportStatus =
  (typeof REPORT_STATUSES)[number];

export const REPORT_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type ReportPriority =
  (typeof REPORT_PRIORITIES)[number];

export type ReportParticipantRole =
  | "customer"
  | "worker";

export interface ReportCase {
  id: string;
  booking_id: number;

  reporter_id: string;
  reported_user_id: string;

  reporter_role: ReportParticipantRole;
  reported_role: ReportParticipantRole;

  case_type: ReportCaseType;
  category: string;
  subject: string;
  description: string;
  requested_resolution: string | null;

  status: ReportStatus;
  priority: ReportPriority;

  assigned_admin_id: string | null;
  admin_notes: string | null;
  resolution: string | null;

  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  withdrawn_at: string | null;
}

export interface ReportEvidence {
  id: string;
  report_id: string;
  uploaded_by: string;

  storage_bucket: string;
  storage_path: string;

  file_name: string;
  mime_type: string;
  file_size: number;

  caption: string | null;
  created_at: string;
}

export interface ReportLog {
  id: string;
  report_id: string;
  actor_id: string | null;

  action: string;
  old_status: ReportStatus | null;
  new_status: ReportStatus | null;
  note: string | null;

  is_public: boolean;
  created_at: string;
}

export interface CreateReportInput {
  booking_id: number;

  reporter_id: string;
  reported_user_id: string;

  reporter_role: ReportParticipantRole;
  reported_role: ReportParticipantRole;

  case_type: ReportCaseType;
  category: string;
  subject: string;
  description: string;
  requested_resolution?: string | null;
  priority?: ReportPriority;
}

export interface ReportableBooking {
  booking_id: number;
  customer_id: string;
  worker_id: string;
  booking_status: string;
  other_user_id: string;
  other_user_role: ReportParticipantRole;
  service_id: number | null;
}

export const CUSTOMER_REPORT_CATEGORIES = [
  "No-show",
  "Late arrival",
  "Poor service quality",
  "Incomplete work",
  "Overcharging",
  "Payment dispute",
  "Damaged property",
  "Harassment or abusive behavior",
  "Fraud or scam",
  "Fake identity or information",
  "Safety concern",
  "Other",
] as const;

export const WORKER_REPORT_CATEGORIES = [
  "Fake booking",
  "Customer no-show",
  "Refused payment",
  "Payment dispute",
  "Harassment or abusive behavior",
  "Unsafe service location",
  "Spam booking",
  "Fraud or scam",
  "Property or equipment damage",
  "Other",
] as const;

export const REPORT_EVIDENCE_BUCKET =
  "report-evidence";

export const MAX_REPORT_EVIDENCE_FILES = 5;
export const MAX_REPORT_EVIDENCE_FILE_SIZE =
  5 * 1024 * 1024;

export const ALLOWED_REPORT_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
