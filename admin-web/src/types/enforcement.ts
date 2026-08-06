export type EnforcementActionType = "warning" | "suspension" | "permanent_review" | "points_adjustment";
export type EnforcementStatus = "active" | "reversed" | "expired";
export type AppealStatus = "submitted" | "under_review" | "approved" | "partially_approved" | "rejected" | "withdrawn";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export interface EnforcementAction { id:string; report_id:string|null; user_id:string; action_type:EnforcementActionType; points:number; reason:string; status:EnforcementStatus; starts_at:string; ends_at:string|null; issued_by:string; reversed_by:string|null; reversal_reason:string|null; created_at:string; updated_at:string; }
export interface EnforcementAppeal { id:string; enforcement_id:string; appellant_id:string; reason:string; requested_outcome:string|null; status:AppealStatus; admin_response:string|null; reviewed_by:string|null; created_at:string; updated_at:string; reviewed_at:string|null; enforcement?:EnforcementAction|null; appellant?:{id:string;first_name:string|null;last_name:string|null;email:string|null;role:string|null}|null; }
export interface AccountRiskSummary { user_id:string; warning_points:number; warning_count:number; suspension_count:number; valid_case_count:number; active_suspension_until:string|null; risk_level:RiskLevel; last_action_at:string|null; }
