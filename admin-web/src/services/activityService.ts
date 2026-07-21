import { supabase } from "../lib/supabase";

// =========================
// LOG ACTIVITY
// =========================
export async function logActivity(
  userId: string,
  action: string,
  module: string,
  description: string,
) {
  // Check authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("========== ACTIVITY LOG ==========");
  console.log("Authenticated User:", user);
  console.log("Auth Error:", authError);

  console.log("Passed User ID:", userId);
  console.log("Action:", action);
  console.log("Module:", module);
  console.log("Description:", description);

  // Check if profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  console.log("Profile Found:", profile);

  // Insert log
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: userId,
      action,
      module,
      description,
    })
    .select();

  console.log("Inserted Data:", data);

  if (error) {
    console.log("========== DATABASE ERROR ==========");
    console.log("Code:", error.code);
    console.log("Message:", error.message);
    console.log("Details:", error.details);
    console.log("Hint:", error.hint);
    console.log("Full Error:", error);
    console.log("===================================");

    throw error;
  }

  console.log("Activity successfully saved.");
  console.log("===================================");

  return data;
}

// =========================
// GET ACTIVITY LOGS
// =========================
export async function getActivityLogs() {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      `
      *,
      user:profiles(
        first_name,
        last_name
      )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.log("GET LOGS ERROR:", error);
    throw error;
  }

  console.log("Activity Logs:", data);

  return data ?? [];
}
