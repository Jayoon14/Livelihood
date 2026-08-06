import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";
import { logActivity } from "./activityService";

import type {
  AccountRiskSummary,
  AppealStatus,
  EnforcementAction,
  EnforcementActionType,
  EnforcementAppeal,
  RiskLevel,
} from "../types/enforcement";

interface RiskSummaryRow {
  user_id: string;
  warning_points: number | string | null;
  warning_count: number | string | null;
  suspension_count: number | string | null;
  valid_case_count: number | string | null;
  active_suspension_until: string | null;
  risk_level: RiskLevel;
  last_action_at: string | null;
}

interface RiskProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  status: string | null;
}

export interface AdminRiskProfile extends RiskProfileRow {
  risk: AccountRiskSummary | null;
}

interface IssueEnforcementInput {
  userId: string;
  reportId?: string | null;
  actionType: EnforcementActionType;
  points: number;
  reason: string;
  durationDays?: number | null;
}

interface SubmitAppealInput {
  enforcementId: string;
  reason: string;
  requestedOutcome?: string;
}

async function currentUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Session expired.");
  }

  return data.user;
}

function normalizeRiskSummary(
  row: RiskSummaryRow,
): AccountRiskSummary {
  return {
    user_id: row.user_id,
    warning_points: Number(
      row.warning_points ?? 0,
    ),
    warning_count: Number(
      row.warning_count ?? 0,
    ),
    suspension_count: Number(
      row.suspension_count ?? 0,
    ),
    valid_case_count: Number(
      row.valid_case_count ?? 0,
    ),
    active_suspension_until:
      row.active_suspension_until,
    risk_level: row.risk_level,
    last_action_at: row.last_action_at,
  };
}

export async function getRiskSummaries(
  ids?: string[],
): Promise<AccountRiskSummary[]> {
  const { data, error } = await supabase.rpc(
    "get_account_risk_summary",
    {
      requested_user_ids:
        ids?.length ? ids : null,
    },
  );

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as RiskSummaryRow[]
  ).map(normalizeRiskSummary);
}

export async function getAdminRiskProfiles():
  Promise<AdminRiskProfile[]> {
  const { data: profiles, error } =
    await supabase
      .from("profiles")
      .select(
        "id,first_name,last_name,email,role,status",
      )
      .in("role", ["customer", "worker"]);

  if (error) {
    throw error;
  }

  const typedProfiles =
    (profiles ?? []) as RiskProfileRow[];

  const risks = await getRiskSummaries(
    typedProfiles.map(
      (profile) => profile.id,
    ),
  );

  const riskByUserId = new Map(
    risks.map(
      (risk) => [risk.user_id, risk],
    ),
  );

  return typedProfiles.map(
    (profile): AdminRiskProfile => ({
      ...profile,
      risk:
        riskByUserId.get(profile.id) ?? null,
    }),
  );
}

export async function getUserEnforcements(
  userId?: string,
): Promise<EnforcementAction[]> {
  const resolvedUserId =
    userId ?? (await currentUser()).id;

  const { data, error } = await supabase
    .from("enforcement_actions")
    .select("*")
    .eq("user_id", resolvedUserId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as EnforcementAction[];
}

export async function issueEnforcement(
  input: IssueEnforcementInput,
): Promise<EnforcementAction> {
  const admin = await currentUser();
  const reason = input.reason.trim();

  if (reason.length < 10) {
    throw new Error(
      "Reason must contain at least 10 characters.",
    );
  }

  const endsAt =
    input.actionType === "suspension" &&
    input.durationDays
      ? new Date(
          Date.now() +
            input.durationDays * 86_400_000,
        ).toISOString()
      : null;

  const { data, error } = await supabase
    .from("enforcement_actions")
    .insert({
      user_id: input.userId,
      report_id: input.reportId ?? null,
      action_type: input.actionType,
      points: input.points,
      reason,
      ends_at: endsAt,
      issued_by: admin.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (input.actionType === "suspension") {
    const profileUpdate = await supabase
      .from("profiles")
      .update({ status: "Disabled" })
      .eq("id", input.userId);

    if (profileUpdate.error) {
      throw profileUpdate.error;
    }
  }

  await Promise.allSettled([
    createNotification(
      input.userId,
      null,
      input.actionType === "warning"
        ? "Official Account Warning"
        : "Account Enforcement Action",
      reason,
    ),
    logActivity(
      admin.id,
      "ENFORCEMENT",
      "Trust & Safety",
      `${input.actionType} issued to ${input.userId}.`,
    ),
  ]);

  return data as EnforcementAction;
}

export async function reverseEnforcement(
  action: EnforcementAction,
  reason: string,
): Promise<void> {
  const admin = await currentUser();

  const { error } = await supabase
    .from("enforcement_actions")
    .update({
      status: "reversed",
      reversed_by: admin.id,
      reversal_reason: reason,
    })
    .eq("id", action.id);

  if (error) {
    throw error;
  }

  if (action.action_type === "suspension") {
    const profileUpdate = await supabase
      .from("profiles")
      .update({ status: "Approved" })
      .eq("id", action.user_id);

    if (profileUpdate.error) {
      throw profileUpdate.error;
    }
  }

  await createNotification(
    action.user_id,
    null,
    "Penalty Reversed",
    reason,
  );
}

export async function getMyAppeals():
  Promise<EnforcementAppeal[]> {
  const user = await currentUser();

  const { data, error } = await supabase
    .from("enforcement_appeals")
    .select(
      "*, enforcement:enforcement_actions(*)",
    )
    .eq("appellant_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as EnforcementAppeal[];
}

export async function getMyAppealableActions():
  Promise<EnforcementAction[]> {
  const user = await currentUser();

  const [actions, appeals] =
    await Promise.all([
      getUserEnforcements(user.id),
      getMyAppeals(),
    ]);

  const appealedActionIds = new Set(
    appeals.map(
      (appeal) => appeal.enforcement_id,
    ),
  );

  return actions.filter(
    (action) =>
      action.status === "active" &&
      !appealedActionIds.has(action.id),
  );
}

export async function submitAppeal(
  input: SubmitAppealInput,
): Promise<EnforcementAppeal> {
  const user = await currentUser();

  const { data, error } = await supabase
    .from("enforcement_appeals")
    .insert({
      enforcement_id:
        input.enforcementId,
      appellant_id: user.id,
      reason: input.reason.trim(),
      requested_outcome:
        input.requestedOutcome?.trim() ||
        null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as EnforcementAppeal;
}

export async function getAdminAppeals():
  Promise<EnforcementAppeal[]> {
  const { data, error } = await supabase
    .from("enforcement_appeals")
    .select(`
      *,
      enforcement:enforcement_actions(*),
      appellant:profiles!appellant_id(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as EnforcementAppeal[];
}

export async function reviewAppeal(
  appeal: EnforcementAppeal,
  status: AppealStatus,
  response: string,
): Promise<void> {
  const admin = await currentUser();
  const responseText = response.trim();

  if (responseText.length < 10) {
    throw new Error(
      "Admin response must contain at least 10 characters.",
    );
  }

  const { error } = await supabase
    .from("enforcement_appeals")
    .update({
      status,
      admin_response: responseText,
      reviewed_by: admin.id,
      reviewed_at:
        new Date().toISOString(),
    })
    .eq("id", appeal.id);

  if (error) {
    throw error;
  }

  if (
    (
      status === "approved" ||
      status === "partially_approved"
    ) &&
    appeal.enforcement
  ) {
    await reverseEnforcement(
      appeal.enforcement,
      responseText,
    );
  }

  await createNotification(
    appeal.appellant_id,
    null,
    "Appeal Decision",
    responseText,
  );
}
