import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";

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
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
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
  console.log("APPROVE WORKER ID:", id);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      status: "Approved",
    })
    .eq("id", id)
    .select();

  console.log("APPROVE UPDATED DATA:", data);

  console.log("APPROVE ERROR:", error);

  if (error) {
    throw error;
  }

  await logActivity(id, "APPROVED", "Workers", "Worker account approved");

  // ====================
  // NOTIFY WORKER
  // ====================

  await createNotification(
    id,
    0,
    "Registration Approved",
    "Congratulations! Your worker account has been approved. You can now start accepting bookings.",
  );

  return data;
}

// ====================
// REJECT WORKER
// ====================

export async function rejectWorker(id: string) {
  console.log("REJECT WORKER ID:", id);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      status: "Rejected",
    })
    .eq("id", id)
    .select();

  console.log("REJECT UPDATED DATA:", data);

  console.log("REJECT ERROR:", error);

  if (error) {
    throw error;
  }

  await logActivity(id, "REJECTED", "Workers", "Worker account rejected");

  // ====================
  // NOTIFY WORKER
  // ====================

  await createNotification(
    id,
    0,
    "Registration Rejected",
    "Your worker registration has been rejected. Please contact the administrator for more information.",
  );

  return data;
}

// ====================
// EDUCATION
// ====================

export async function getEducation(profileId: string) {
  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

// ====================
// WORK EXPERIENCE
// ====================

export async function getWorkExperience(profileId: string) {
  const { data, error } = await supabase
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

export async function getSkills(profileId: string) {
  const { data, error } = await supabase
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

export async function getDocuments(profileId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

// ====================
// SERVICES
// ====================

export async function getServices(profileId: string) {
  const { data, error } = await supabase
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

export async function getCompleteWorkerProfile(profileId: string) {
  const [profile, education, workExperience, skills, documents, services] =
    await Promise.all([
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

// =====================
// FEATURED WORKERS
// =====================

export async function getFeaturedWorkers(limit = 6) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      services(
        category,
        service_name,
        price
      )
      `,
    )
    .eq("role", "worker")
    .eq("status", "Approved")
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =====================
// GET CATEGORIES
// =====================

export async function getCategories() {
  const { data, error } = await supabase.from("services").select("category");

  if (error) {
    throw error;
  }

  const unique = [
    ...new Set((data ?? []).map((x) => x.category).filter(Boolean)),
  ];

  return unique;
}

// =====================
// ADVANCED SEARCH
// =====================

export async function searchDashboard(
  keyword = "",
  category = "",
  minPrice?: number,
  maxPrice?: number,
) {
  let query = supabase
    .from("profiles")
    .select(
      `
      *,
      services(
        id,
        category,
        service_name,
        price
      )
      `,
    )
    .eq("role", "worker")
    .eq("status", "Approved");

  if (keyword.trim()) {
    query = query.or(
      `first_name.ilike.%${keyword}%,last_name.ilike.%${keyword}%,email.ilike.%${keyword}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let workers = data ?? [];

  // Filter Category

  if (category) {
    workers = workers.filter((worker: any) =>
      worker.services?.some((service: any) => service.category === category),
    );
  }

  // Filter Price

  if (minPrice !== undefined || maxPrice !== undefined) {
    workers = workers.filter((worker: any) =>
      worker.services?.some((service: any) => {
        const price = Number(service.price);

        if (minPrice !== undefined && price < minPrice) {
          return false;
        }

        if (maxPrice !== undefined && price > maxPrice) {
          return false;
        }

        return true;
      }),
    );
  }

  // Calculate Rating

const workersWithRating = await Promise.all(
  workers.map(async (worker: any) => {
    // Reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("worker_id", worker.id);

    // Completed Jobs
    const { count: completedJobs } = await supabase
      .from("bookings")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("worker_id", worker.id)
      .eq("status", "Completed");

    let average = 0;

    if (reviews && reviews.length > 0) {
      const total = reviews.reduce(
        (sum: number, review: any) =>
          sum + Number(review.rating),
        0,
      );

      average = Number(
        (total / reviews.length).toFixed(1),
      );
    }

    return {
      ...worker,
      average_rating: average,
      completed_jobs: completedJobs ?? 0,
    };
  }),
);

return workersWithRating;
}

// =============================
// CUSTOMER WORKER PROFILE
// =============================

export async function getCustomerWorkerProfile(workerId: string) {
  const profile = await getCompleteWorkerProfile(workerId);

  return profile;
}
// =============================
// GET WORKERS BY CATEGORY
// =============================

export async function getWorkersByCategory(category: string) {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_picture
      )
      `,
    )
    .eq("category", category);

  if (error) {
    throw error;
  }

  const uniqueWorkers = Array.from(
    new Map(
      (data ?? []).map((item: any) => [item.worker.id, item.worker]),
    ).values(),
  );

  return uniqueWorkers;
}

// =====================
// CHECK AVAILABILITY
// =====================

export async function isWorkerAvailable(workerId: string) {
  const today = new Date();

  const day = today.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const date = today.toISOString().split("T")[0];

  // Weekly Schedule

  const { data: schedule } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", workerId)
    .eq("day_of_week", day)
    .eq("is_available", true);

  // Unavailable Dates

  const { data: unavailable } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", workerId)
    .eq("unavailable_date", date);

  return Boolean(
    schedule &&
    schedule.length > 0 &&
    (!unavailable || unavailable.length === 0),
  );
}

// =====================
// TOP RATED WORKERS
// =====================

export async function getTopRatedWorkers(limit = 5) {
  const workers = await getFeaturedWorkers(100);

  const ranked = await Promise.all(
    workers.map(async (worker: any) => {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("worker_id", worker.id);

      let average = 0;

      if (reviews && reviews.length > 0) {
        const total = reviews.reduce(
          (sum: number, review: any) => sum + Number(review.rating),
          0,
        );

        average = Number((total / reviews.length).toFixed(1));
      }

      return {
        ...worker,
        average_rating: average,
      };
    }),
  );

  return ranked
    .sort((a, b) => b.average_rating - a.average_rating)
    .slice(0, limit);
}

// =====================
// RECOMMENDED WORKERS
// =====================

export async function getRecommendedWorkers(customerId: string) {
  // Get latest completed booking

  const { data: booking } = await supabase
    .from("bookings")
    .select("service_id")
    .eq("customer_id", customerId)
    .eq("status", "Completed")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  // No previous booking

  if (!booking || !booking.service_id) {
    return getFeaturedWorkers(5);
  }

  // Get service category

  const { data: service } = await supabase
    .from("services")
    .select("category")
    .eq("id", booking.service_id)
    .single();

  if (!service) {
    return getFeaturedWorkers(5);
  }

  // Get approved workers

  const { data } = await supabase
    .from("profiles")
    .select(
      `
        *,
        services(*)
        `,
    )
    .eq("role", "worker")
    .eq("status", "Approved");

  if (!data) {
    return [];
  }

  return data.filter((worker: any) =>
    worker.services?.some((s: any) => s.category === service.category),
  );
}
