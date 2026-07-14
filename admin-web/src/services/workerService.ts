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
// ====================
// COMPLETE WORKER PROFILE
// ====================

export async function getCompleteWorkerProfile(
  profileId: string
) {
  const [
    profile,
    education,
    workExperience,
    skills,
    documents,
    services,
  ] = await Promise.all([
    getWorker(profileId),
    getEducation(profileId),
    getWorkExperience(profileId),
    getSkills(profileId),
    getDocuments(profileId),
    getServices(profileId),
  ]);

  return {
    profile,
    education,
    workExperience,
    skills,
    documents,
    services,
  };
}

// ====================
// WORKER REVIEWS
// ====================

export async function getWorkerReviews(
  workerId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("reviews")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

// ====================
// WORKER RATING
// ====================

export async function getWorkerRating(
  workerId: string
) {
  const reviews =
    await getWorkerReviews(workerId);

  if (reviews.length === 0) {
    return {
      rating: 0,
      total: 0,
    };
  }

  const totalStars = reviews.reduce(
    (sum, review: any) =>
      sum + review.rating,
    0
  );

  return {
    rating: Number(
      (
        totalStars /
        reviews.length
      ).toFixed(1)
    ),
    total: reviews.length,
  };
}
// =====================
// FEATURED WORKERS
// =====================

export async function getFeaturedWorkers(limit = 6) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      services(
        category,
        service_name,
        price
      )
    `)
    .eq("role", "worker")
    .eq("status", "Approved")
    .limit(limit);

  if (error) throw error;

  return data ?? [];
}

// =====================
// GET CATEGORIES
// =====================

export async function getCategories() {
  const { data, error } = await supabase
    .from("services")
    .select("category");

  if (error) throw error;

  const unique = [
    ...new Set(
      (data ?? [])
        .map((x) => x.category)
        .filter(Boolean)
    ),
  ];

  return unique;
}

// =====================
// SEARCH DASHBOARD
// =====================

export async function searchDashboard(keyword: string) {
  let query = supabase
    .from("profiles")
    .select(`
      *,
      services(
        category,
        service_name,
        price
      )
    `)
    .eq("role", "worker")
    .eq("status", "Approved");

  if (keyword.trim()) {
    query = query.or(
      `first_name.ilike.%${keyword}%,
       last_name.ilike.%${keyword}%,
       email.ilike.%${keyword}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}
// =============================
// CUSTOMER WORKER PROFILE
// =============================

export async function getCustomerWorkerProfile(workerId: string) {
  const profile = await getCompleteWorkerProfile(workerId);

  return profile;
}