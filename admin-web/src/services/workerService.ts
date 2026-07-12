import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";

// ====================
// GET ALL WORKERS
// ====================

export async function getWorkers(search = "") {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", {
      ascending: false,
    });

  if (search.trim() !== "") {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  console.log("GET WORKERS DATA:", data);
  console.log("GET WORKERS ERROR:", error);

  if (error) {
    throw error;
  }

  return data ?? [];
}
// ====================
// GET SINGLE WORKER
// ====================

export async function getWorker(id: string) {
  console.log("GET WORKER ID:", id);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  console.log("GET WORKER DATA:", data);
  console.log("GET WORKER ERROR:", error);

  if (error) {
    throw error;
  }

  return data;
}

// ====================
// ALIASES
// ====================

export async function getWorkerById(id: string) {
  return getWorker(id);
}

export async function getWorkerDetails(id: string) {
  return getWorker(id);
}
// ====================
// APPROVE WORKER
// ====================

export async function approveWorker(id: string) {
  console.log(
    "APPROVE WORKER ID:",
    id
  );

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .update({
      status: "Approved",
    })
    .eq("id", id)
    .select();


  console.log(
    "APPROVE UPDATED DATA:",
    data
  );

  console.log(
    "APPROVE ERROR:",
    error
  );


  if (error) {
    throw error;
  }


  await logActivity(
    id,
    "APPROVED",
    "Workers",
    "Worker account approved"
  );


  return data;
}



// ====================
// REJECT WORKER
// ====================

export async function rejectWorker(id: string) {
  console.log(
    "REJECT WORKER ID:",
    id
  );

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .update({
      status: "Rejected",
    })
    .eq("id", id)
    .select();


  console.log(
    "REJECT UPDATED DATA:",
    data
  );

  console.log(
    "REJECT ERROR:",
    error
  );


  if (error) {
    throw error;
  }


  await logActivity(
    id,
    "REJECTED",
    "Workers",
    "Worker account rejected"
  );


  return data;
}
// ====================
// EDUCATION
// ====================

export async function getEducation(
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("education")
    .select("*")
    .eq("profile_id", profileId)
    .single();


  if (
    error &&
    error.code !== "PGRST116"
  ) {
    throw error;
  }


  return data;
}



// ====================
// WORK EXPERIENCE
// ====================

export async function getWorkExperience(
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("work_experience")
    .select("*")
    .eq("profile_id", profileId);


  if (error) {
    throw error;
  }


  return data ?? [];
}



// ====================
// SKILLS
// ====================

export async function getSkills(
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("worker_skills")
    .select("*")
    .eq("profile_id", profileId);


  if (error) {
    throw error;
  }


  return data ?? [];
}



// ====================
// DOCUMENTS
// ====================

export async function getDocuments(
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("documents")
    .select("*")
    .eq("profile_id", profileId)
    .single();


  if (
    error &&
    error.code !== "PGRST116"
  ) {
    throw error;
  }


  return data;
}



// ====================
// SERVICES
// ====================

export async function getServices(
  profileId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", profileId);


  if (error) {
    throw error;
  }


  return data ?? [];
}