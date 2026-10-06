import { runAuditedProcess } from "../lib/processAudit";
import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";
export const WORKER_STATUS = {
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PENDING: "Pending",
    DISABLED: "Disabled",
    BLOCKED: "Blocked",
} as const;
export type WorkerStatus = (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS];
export interface WorkerProfile {
    id: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    profile_picture: string | null;
    profile_image?: string | null;
    avatar_url?: string | null;
    gender?: string | null;
    birth_date?: string | null;
    civil_status?: string | null;
    religion?: string | null;
    house_no?: string | null;
    street?: string | null;
    address?: string | null;
    barangay?: string | null;
    municipality?: string | null;
    province?: string | null;
    role: string;
    status: string | null;
    created_at?: string;
    last_seen?: string | null;
    [key: string]: unknown;
}
export interface WorkerServiceRecord {
    id: string | number;
    worker_id?: string;
    category: string | null;
    service_name: string | null;
    description: string | null;
    price: number | string | null;
}
export interface WorkerWithServices extends WorkerProfile {
    services: WorkerServiceRecord[];
}
export interface WorkerSearchResult extends WorkerWithServices {
    average_rating: number;
    completed_jobs: number;
}
export interface EducationRecord {
    id?: string | number;
    profile_id: string;
    [key: string]: unknown;
}
export interface WorkExperienceRecord {
    id: string | number;
    profile_id: string;
    company?: string | null;
    position: string | null;
    employment_status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    company_name?: string | null;
    start_year?: string | number | null;
    end_year?: string | number | null;
}
export interface WorkerSkillRecord {
    id: string | number;
    profile_id: string;
    skill: string;
    skill_name?: string | null;
}
export interface WorkerDocumentRecord {
    id?: string | number;
    profile_id: string;
    [key: string]: unknown;
}
export interface WorkerEducationUpdate {
    highest_attainment?: string | null;
    elementary?: string | null;
    secondary?: string | null;
    senior_high?: string | null;
    college?: string | null;
    course?: string | null;
    year_graduated?: string | null;
    tesda?: string | null;
    prc?: string | null;
    trainings?: string | null;
}
export interface WorkerWorkExperienceUpdate {
    id?: string | number;
    company?: string | null;
    position?: string | null;
    employment_status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
}
export interface WorkerProfessionalProfileUpdate {
    education: WorkerEducationUpdate;
    skills: string[];
    workExperience: WorkerWorkExperienceUpdate[];
}
export interface CompleteWorkerProfile {
    profile: WorkerProfile;
    education: EducationRecord | null;
    workExperience: WorkExperienceRecord[];
    skills: WorkerSkillRecord[];
    documents: WorkerDocumentRecord | null;
    services: WorkerServiceRecord[];
}
interface ReviewRecord {
    rating: number | string | null;
}
export interface CustomerWorkerCardMetric {
    worker_id: string;
    completed_jobs: number | string | null;
    is_online: boolean | null;
    is_available: boolean | null;
    location_updated_at: string | null;
}
export async function getCustomerWorkerCardMetrics(workerIds: string[]): Promise<Map<string, CustomerWorkerCardMetric>> {
    return await runAuditedProcess({ module: "Workers", process: "getCustomerWorkerCardMetrics", action: "READ", parameters: { workerIds } }, async () => {
        const requestedWorkerIds = Array.from(new Set(workerIds
            .map((workerId) => workerId.trim())
            .filter(Boolean)));
        if (!requestedWorkerIds.length) {
            return new Map();
        }
        const { data, error } = await supabase.rpc("get_customer_worker_card_metrics", { requested_worker_ids: requestedWorkerIds });
        if (error) {
            throw error;
        }
        return new Map(((data ?? []) as CustomerWorkerCardMetric[]).map((metric) => [String(metric.worker_id), metric]));
    });
}
interface ServiceCategoryRecord {
    category: string | null;
}
interface WorkerRelationRecord {
    worker: WorkerProfile | WorkerProfile[] | null;
}
interface CompletedBookingRecord {
    service_id: string | number | null;
}
const WORKER_WITH_SERVICES_SELECT = `
  *,
  services(
    id,
    category,
    service_name,
    description,
    price
  )
`;
function validateRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
}
function validateWorkerId(workerId: string): string {
    return validateRequiredText(workerId, "Worker ID");
}
function validateLimit(limit: number, fallback: number): number {
    if (!Number.isFinite(limit) || limit <= 0) {
        return fallback;
    }
    return Math.floor(limit);
}
function validatePriceFilter(value: number | undefined, fieldName: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${fieldName} must be a valid non-negative number.`);
    }
    return value;
}
function normalizeServices(services: unknown): WorkerServiceRecord[] {
    return Array.isArray(services) ? (services as WorkerServiceRecord[]) : [];
}
function normalizeWorkerWithServices(value: unknown): WorkerWithServices {
    const worker = value as WorkerProfile & {
        services?: unknown;
    };
    return {
        ...worker,
        services: normalizeServices(worker.services),
    };
}
function normalizeWorkerRelation(relation: WorkerProfile | WorkerProfile[] | null): WorkerProfile | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null;
    }
    return relation;
}
function calculateAverageRating(reviews: ReviewRecord[] | null): number {
    if (!reviews?.length) {
        return 0;
    }
    const validRatings = reviews
        .map((review) => Number(review.rating))
        .filter((rating) => Number.isFinite(rating));
    if (!validRatings.length) {
        return 0;
    }
    const total = validRatings.reduce((sum, rating) => sum + rating, 0);
    return Number((total / validRatings.length).toFixed(1));
}
async function enrichWorkersWithMetrics(workers: WorkerWithServices[]): Promise<WorkerSearchResult[]> {
    if (!workers.length) {
        return [];
    }
    const workerIds = workers.map((worker) => worker.id);
    const [reviewsResult, metricsByWorker] = await Promise.all([
        supabase
            .from("reviews")
            .select("worker_id, rating")
            .in("worker_id", workerIds),
        getCustomerWorkerCardMetrics(workerIds),
    ]);
    if (reviewsResult.error) {
        throw reviewsResult.error;
    }
    const ratingsByWorker = new Map<string, ReviewRecord[]>();
    for (const row of reviewsResult.data ?? []) {
        const workerId = String(row.worker_id ?? "");
        if (!workerId)
            continue;
        const current = ratingsByWorker.get(workerId) ?? [];
        current.push({ rating: row.rating });
        ratingsByWorker.set(workerId, current);
    }
    return workers.map((worker) => {
        const metric = metricsByWorker.get(worker.id);
        return {
            ...worker,
            average_rating: calculateAverageRating(ratingsByWorker.get(worker.id) ?? []),
            completed_jobs: Number(metric?.completed_jobs ?? 0),
        };
    });
}
async function updateWorkerStatus(workerId: string, status: WorkerStatus, activityAction: string, activityDescription: string, notificationTitle: string, notificationMessage: string): Promise<WorkerProfile[]> {
    const id = validateWorkerId(workerId);
    const { data, error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id)
        .eq("role", "worker")
        .select();
    if (error) {
        throw error;
    }
    const workers = (data ?? []) as WorkerProfile[];
    if (!workers.length) {
        throw new Error("Worker account was not found.");
    }
    const sideEffects = await Promise.allSettled([
        logActivity(id, activityAction, "Workers", activityDescription),
        createNotification(id, 0, notificationTitle, notificationMessage),
    ]);
    sideEffects.forEach((result) => {
        if (result.status === "rejected") {
            console.error("Worker status side effect failed:", result.reason);
        }
    });
    return workers;
}
// ====================
// GET ALL WORKERS
// ====================
export async function getWorkers(search = "", status: WorkerStatus | "All" = "All"): Promise<WorkerProfile[]> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkers", action: "READ", parameters: { search, status } }, async () => {
        let query = supabase
            .from("profiles")
            .select("*")
            .eq("role", "worker")
            .order("created_at", {
            ascending: false,
        });
        if (status !== "All") {
            query = query.eq("status", status);
        }
        const keyword = search.trim();
        if (keyword) {
            const escapedKeyword = keyword.replace(/[%(),]/g, "");
            query = query.or(`first_name.ilike.%${escapedKeyword}%,last_name.ilike.%${escapedKeyword}%,email.ilike.%${escapedKeyword}%`);
        }
        const { data, error } = await query;
        if (error) {
            throw error;
        }
        return (data ?? []) as WorkerProfile[];
    });
}
// ====================
// GET SINGLE WORKER
// ====================
export async function getWorker(id: string): Promise<WorkerProfile> {
    return await runAuditedProcess({ module: "Workers", process: "getWorker", action: "READ", parameters: { id } }, async () => {
        const workerId = validateWorkerId(id);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", workerId)
            .eq("role", "worker")
            .single();
        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error("Worker was not found.");
        }
        return data as WorkerProfile;
    });
}
// ====================
// ALIASES
// ====================
export async function getWorkerById(id: string): Promise<WorkerProfile> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkerById", action: "READ", parameters: { id } }, async () => {
        return getWorker(id);
    });
}
export async function getWorkerDetails(id: string): Promise<WorkerWithServices> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkerDetails", action: "READ", parameters: { id } }, async () => {
        const workerId = validateWorkerId(id);
        const { data, error } = await supabase
            .from("profiles")
            .select(`
      *,
      services (
        id,
        category,
        service_name,
        description,
        price
      )
    `)
            .eq("id", workerId)
            .eq("role", "worker")
            .single();
        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error("Worker was not found.");
        }
        return normalizeWorkerWithServices(data);
    });
}
// ====================
// APPROVE WORKER
// ====================
export async function approveWorker(id: string): Promise<WorkerProfile[]> {
    return await runAuditedProcess({ module: "Workers", process: "approveWorker", action: "APPROVE", parameters: { id } }, async () => {
        return updateWorkerStatus(id, WORKER_STATUS.APPROVED, "APPROVED", "Worker account approved", "Registration Approved", "Congratulations! Your worker account has been approved. You can now start accepting bookings.");
    });
}
// ====================
// REJECT WORKER
// ====================
export async function rejectWorker(id: string, reason = ""): Promise<WorkerProfile[]> {
    return await runAuditedProcess({ module: "Workers", process: "rejectWorker", action: "REJECT", parameters: { id, reason } }, async () => {
        const workerId = validateWorkerId(id);
        const { data, error } = await supabase.functions.invoke("reject-worker", {
            body: {
                workerId,
                reason: reason.trim() || null,
            },
        });
        if (error) {
            throw new Error(`Unable to reject worker: ${error.message}`);
        }
        const response = data as {
            success?: boolean;
            error?: string;
            worker?: WorkerProfile;
        } | null;
        if (!response?.success || !response.worker) {
            throw new Error(response?.error ?? "Worker rejection did not complete.");
        }
        return [
            {
                ...response.worker,
                status: WORKER_STATUS.REJECTED,
            },
        ];
    });
}
// ====================
// EDUCATION
// ====================
export async function getEducation(profileId: string): Promise<EducationRecord | null> {
    return await runAuditedProcess({ module: "Workers", process: "getEducation", action: "READ", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const { data, error } = await supabase
            .from("education")
            .select("*")
            .eq("profile_id", workerId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        return (data as EducationRecord | null) ?? null;
    });
}
// ====================
// WORK EXPERIENCE
// ====================
export async function getWorkExperience(profileId: string): Promise<WorkExperienceRecord[]> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkExperience", action: "READ", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const { data, error } = await supabase
            .from("work_experience")
            .select("*")
            .eq("profile_id", workerId);
        if (error) {
            throw error;
        }
        return (data ?? []).map((item) => {
            const record = item as WorkExperienceRecord;
            return {
                ...record,
                company: record.company ?? record.company_name ?? null,
                position: record.position ?? null,
                start_date: record.start_date ?? (record.start_year != null ? String(record.start_year) : null),
                end_date: record.end_date ?? (record.end_year != null ? String(record.end_year) : null),
            };
        });
    });
}
// ====================
// SKILLS
// ====================
export async function getSkills(profileId: string): Promise<WorkerSkillRecord[]> {
    return await runAuditedProcess({ module: "Workers", process: "getSkills", action: "READ", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const { data, error } = await supabase
            .from("worker_skills")
            .select("*")
            .eq("profile_id", workerId);
        if (error) {
            throw error;
        }
        return (data ?? []).map((item) => {
            const record = item as WorkerSkillRecord;
            return {
                ...record,
                skill: String(record.skill ?? record.skill_name ?? "").trim(),
            };
        }).filter((item) => item.skill.length > 0);
    });
}
// ====================
// UPDATE WORKER PROFESSIONAL PROFILE
// ====================
export async function updateWorkerProfessionalProfile(profileId: string, updates: WorkerProfessionalProfileUpdate): Promise<void> {
    return await runAuditedProcess({ module: "Workers", process: "updateWorkerProfessionalProfile", action: "UPDATE", parameters: { profileId, updates } }, async () => {
        const workerId = validateWorkerId(profileId);
        const educationPayload = {
            profile_id: workerId,
            highest_attainment: updates.education.highest_attainment?.trim() || null,
            elementary: updates.education.elementary?.trim() || null,
            secondary: updates.education.secondary?.trim() || null,
            senior_high: updates.education.senior_high?.trim() || null,
            college: updates.education.college?.trim() || null,
            course: updates.education.course?.trim() || null,
            year_graduated: updates.education.year_graduated?.trim() || null,
            tesda: updates.education.tesda?.trim() || null,
            prc: updates.education.prc?.trim() || null,
            trainings: updates.education.trainings?.trim() || null,
        };
        const { error: educationError } = await supabase
            .from("education")
            .upsert(educationPayload, { onConflict: "profile_id" });
        if (educationError) {
            throw new Error(`Unable to update education: ${educationError.message}`);
        }
        const normalizedSkills = Array.from(new Set(updates.skills.map((skill) => skill.trim()).filter(Boolean)));
        const { error: deleteSkillsError } = await supabase
            .from("worker_skills")
            .delete()
            .eq("profile_id", workerId);
        if (deleteSkillsError) {
            throw new Error(`Unable to update skills: ${deleteSkillsError.message}`);
        }
        if (normalizedSkills.length) {
            const { error: skillsError } = await supabase
                .from("worker_skills")
                .insert(normalizedSkills.map((skill) => ({
                profile_id: workerId,
                skill_name: skill,
            })));
            if (skillsError) {
                throw new Error(`Unable to save skills: ${skillsError.message}`);
            }
        }
        const { error: deleteExperienceError } = await supabase
            .from("work_experience")
            .delete()
            .eq("profile_id", workerId);
        if (deleteExperienceError) {
            throw new Error(`Unable to update work experience: ${deleteExperienceError.message}`);
        }
        const experiences = updates.workExperience
            .map((job) => ({
            profile_id: workerId,
            company: job.company?.trim() || null,
            position: job.position?.trim() || null,
            employment_status: job.employment_status?.trim() || null,
            start_date: job.start_date?.trim() || null,
            end_date: job.end_date?.trim() || null,
            description: job.description?.trim() || null,
        }))
            .filter((job) => job.company || job.position || job.description);
        if (experiences.length) {
            const { error: experienceError } = await supabase
                .from("work_experience")
                .insert(experiences);
            if (experienceError) {
                throw new Error(`Unable to save work experience: ${experienceError.message}`);
            }
        }
    });
}
// ====================
// DOCUMENTS
// ====================
export async function getDocuments(profileId: string): Promise<WorkerDocumentRecord | null> {
    return await runAuditedProcess({ module: "Workers", process: "getDocuments", action: "READ", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const { data, error } = await supabase
            .from("documents")
            .select("*")
            .eq("profile_id", workerId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        return (data as WorkerDocumentRecord | null) ?? null;
    });
}
// ====================
// SERVICES
// ====================
export async function getServices(profileId: string): Promise<WorkerServiceRecord[]> {
    return await runAuditedProcess({ module: "Workers", process: "getServices", action: "READ", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const { data, error } = await supabase
            .from("services")
            .select("*")
            .eq("worker_id", workerId);
        if (error) {
            throw error;
        }
        return (data ?? []) as WorkerServiceRecord[];
    });
}
// ====================
// COMPLETE WORKER PROFILE
// ====================
const WORKER_DOCUMENT_MAX_SIZE = 50 * 1024 * 1024;
const WORKER_DOCUMENT_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
]);
export type WorkerDocumentKey = "valid_id" | "resume" | "tesda_certificate" | "barangay_clearance" | "police_clearance" | "nbi_clearance";
const WORKER_DOCUMENT_FOLDERS: Record<WorkerDocumentKey, string> = {
    valid_id: "valid-id",
    resume: "resume",
    tesda_certificate: "tesda-certificate",
    barangay_clearance: "barangay-clearance",
    police_clearance: "police-clearance",
    nbi_clearance: "nbi-clearance",
};
function workerDocumentExtension(file: File): string {
    const extension = file.name.split(".").pop()?.trim().toLowerCase();
    if (extension === "jpeg")
        return "jpg";
    if (extension === "jpg" || extension === "png" || extension === "webp" || extension === "pdf") {
        return extension;
    }
    throw new Error("Document must be a JPG, PNG, WEBP, or PDF file.");
}
export async function updateWorkerDocument(profileId: string, documentKey: WorkerDocumentKey, file: File): Promise<string> {
    return await runAuditedProcess({ module: "Workers", process: "updateWorkerDocument", action: "UPDATE", parameters: { profileId, documentKey, file } }, async () => {
        const workerId = validateWorkerId(profileId);
        const extension = workerDocumentExtension(file);
        if (file.size <= 0 || file.size > WORKER_DOCUMENT_MAX_SIZE) {
            throw new Error("Document must be a non-empty file no larger than 50 MB.");
        }
        if (file.type && !WORKER_DOCUMENT_TYPES.has(file.type)) {
            throw new Error("Document must be a JPG, PNG, WEBP, or PDF file.");
        }
        const folder = WORKER_DOCUMENT_FOLDERS[documentKey];
        const path = `${workerId}/${folder}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
            .from("worker-documents")
            .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || undefined,
            upsert: false,
        });
        if (uploadError) {
            throw new Error(`Unable to upload document: ${uploadError.message}`);
        }
        const { data: { publicUrl }, } = supabase.storage.from("worker-documents").getPublicUrl(path);
        const { error: databaseError } = await supabase
            .from("documents")
            .upsert({
            profile_id: workerId,
            [documentKey]: publicUrl,
        }, { onConflict: "profile_id" });
        if (databaseError) {
            throw new Error(`Unable to save document: ${databaseError.message}`);
        }
        return publicUrl;
    });
}
export async function getCompleteWorkerProfile(profileId: string): Promise<CompleteWorkerProfile> {
    return await runAuditedProcess({ module: "Workers", process: "getCompleteWorkerProfile", action: "COMPLETE", parameters: { profileId } }, async () => {
        const workerId = validateWorkerId(profileId);
        const [profile, education, workExperience, skills, documents, services] = await Promise.all([
            getWorker(workerId),
            getEducation(workerId),
            getWorkExperience(workerId),
            getSkills(workerId),
            getDocuments(workerId),
            getServices(workerId),
        ]);
        return {
            profile,
            education,
            workExperience,
            skills,
            documents,
            services,
        };
    });
}
// =====================
// FEATURED WORKERS
// =====================
export async function getFeaturedWorkers(limit = 6): Promise<WorkerWithServices[]> {
    return await runAuditedProcess({ module: "Workers", process: "getFeaturedWorkers", action: "READ", parameters: { limit } }, async () => {
        const validLimit = validateLimit(limit, 6);
        const { data, error } = await supabase
            .from("profiles")
            .select(WORKER_WITH_SERVICES_SELECT)
            .eq("role", "worker")
            .eq("status", WORKER_STATUS.APPROVED)
            .limit(validLimit);
        if (error) {
            throw error;
        }
        return (data ?? []).map(normalizeWorkerWithServices);
    });
}
// =====================
// GET CATEGORIES
// =====================
export async function getCategories(): Promise<string[]> {
    return await runAuditedProcess({ module: "Workers", process: "getCategories", action: "READ", parameters: {} }, async () => {
        const { data, error } = await supabase.from("services").select("category");
        if (error) {
            throw error;
        }
        const categories = (data ?? [])
            .map((item) => (item as ServiceCategoryRecord).category?.trim())
            .filter((category): category is string => Boolean(category));
        return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
    });
}
// =====================
// ADVANCED SEARCH
// =====================
export async function searchDashboard(keyword = "", category = "", minPrice?: number, maxPrice?: number): Promise<WorkerSearchResult[]> {
    return await runAuditedProcess({ module: "Workers", process: "searchDashboard", action: "READ", parameters: { keyword, category, minPrice, maxPrice } }, async () => {
        const validMinPrice = validatePriceFilter(minPrice, "Minimum price");
        const validMaxPrice = validatePriceFilter(maxPrice, "Maximum price");
        if (validMinPrice !== undefined &&
            validMaxPrice !== undefined &&
            validMinPrice > validMaxPrice) {
            throw new Error("Minimum price cannot be greater than maximum price.");
        }
        /*
         * Fetch approved workers with their services first. Supabase/PostgREST
         * cannot reliably apply a profile-level OR filter to nested service
         * fields in the same expression, so the combined profile and service
         * search is performed safely after the records are loaded.
         */
        const { data, error } = await supabase
            .from("profiles")
            .select(WORKER_WITH_SERVICES_SELECT)
            .eq("role", "worker")
            .eq("status", WORKER_STATUS.APPROVED);
        if (error) {
            throw error;
        }
        let workers = (data ?? []).map(normalizeWorkerWithServices);
        const normalizedKeyword = keyword.trim().toLocaleLowerCase();
        if (normalizedKeyword) {
            workers = workers.filter((worker) => {
                const profileSearchText = [
                    worker.first_name,
                    worker.middle_name,
                    worker.last_name,
                    worker.email,
                ]
                    .filter((value): value is string => typeof value === "string")
                    .join(" ")
                    .toLocaleLowerCase();
                const profileMatches = profileSearchText.includes(normalizedKeyword);
                const serviceMatches = worker.services.some((service) => {
                    const serviceSearchText = [
                        service.service_name,
                        service.category,
                        service.description,
                    ]
                        .filter((value): value is string => typeof value === "string")
                        .join(" ")
                        .toLocaleLowerCase();
                    return serviceSearchText.includes(normalizedKeyword);
                });
                return profileMatches || serviceMatches;
            });
        }
        const normalizedCategory = category.trim().toLocaleLowerCase();
        if (normalizedCategory) {
            workers = workers.filter((worker) => worker.services.some((service) => service.category?.trim().toLocaleLowerCase() === normalizedCategory));
        }
        if (validMinPrice !== undefined || validMaxPrice !== undefined) {
            workers = workers.filter((worker) => worker.services.some((service) => {
                const price = Number(service.price);
                if (!Number.isFinite(price)) {
                    return false;
                }
                if (validMinPrice !== undefined && price < validMinPrice) {
                    return false;
                }
                if (validMaxPrice !== undefined && price > validMaxPrice) {
                    return false;
                }
                return true;
            }));
        }
        return enrichWorkersWithMetrics(workers);
    });
}
// =============================
// CUSTOMER WORKER PROFILE
// =============================
export async function getCustomerWorkerProfile(workerId: string): Promise<CompleteWorkerProfile> {
    return await runAuditedProcess({ module: "Workers", process: "getCustomerWorkerProfile", action: "READ", parameters: { workerId } }, async () => {
        return getCompleteWorkerProfile(workerId);
    });
}
// =============================
// GET WORKERS BY CATEGORY
// =============================
export async function getWorkersByCategory(category: string): Promise<WorkerProfile[]> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkersByCategory", action: "READ", parameters: { category } }, async () => {
        const validCategory = validateRequiredText(category, "Category");
        const { data, error } = await supabase
            .from("services")
            .select(`
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        profile_picture,
        role,
        status,
        created_at
      )
      `)
            .eq("category", validCategory);
        if (error) {
            throw error;
        }
        const workers = (data ?? [])
            .map((item) => normalizeWorkerRelation((item as WorkerRelationRecord).worker))
            .filter((worker): worker is WorkerProfile => Boolean(worker));
        return Array.from(new Map(workers.map((worker) => [worker.id, worker])).values());
    });
}
// =====================
// CHECK AVAILABILITY
// =====================
export async function isWorkerAvailable(workerId: string): Promise<boolean> {
    return await runAuditedProcess({ module: "Workers", process: "isWorkerAvailable", action: "READ", parameters: { workerId } }, async () => {
        const id = validateWorkerId(workerId);
        const today = new Date();
        const day = today.toLocaleDateString("en-US", {
            weekday: "long",
        });
        const date = today.toISOString().split("T")[0];
        const [scheduleResult, unavailableResult] = await Promise.all([
            supabase
                .from("worker_schedules")
                .select("id")
                .eq("worker_id", id)
                .eq("day_of_week", day)
                .eq("is_available", true)
                .limit(1),
            supabase
                .from("unavailable_dates")
                .select("id")
                .eq("worker_id", id)
                .eq("unavailable_date", date)
                .limit(1),
        ]);
        if (scheduleResult.error) {
            throw scheduleResult.error;
        }
        if (unavailableResult.error) {
            throw unavailableResult.error;
        }
        return ((scheduleResult.data?.length ?? 0) > 0 &&
            (unavailableResult.data?.length ?? 0) === 0);
    });
}
// =====================
// TOP RATED WORKERS
// =====================
export async function getTopRatedWorkers(limit = 5): Promise<WorkerSearchResult[]> {
    return await runAuditedProcess({ module: "Workers", process: "getTopRatedWorkers", action: "READ", parameters: { limit } }, async () => {
        const validLimit = validateLimit(limit, 5);
        const workers = await getFeaturedWorkers(100);
        const rankedWorkers = await enrichWorkersWithMetrics(workers);
        return rankedWorkers
            .sort((a, b) => {
            if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
            }
            return b.completed_jobs - a.completed_jobs;
        })
            .slice(0, validLimit);
    });
}
// =====================
// RECOMMENDED WORKERS
// =====================
export async function getRecommendedWorkers(customerId: string): Promise<WorkerWithServices[]> {
    return await runAuditedProcess({ module: "Workers", process: "getRecommendedWorkers", action: "READ", parameters: { customerId } }, async () => {
        const id = validateRequiredText(customerId, "Customer ID");
        const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("service_id")
            .eq("customer_id", id)
            .eq("status", "Completed")
            .order("created_at", {
            ascending: false,
        })
            .limit(1)
            .maybeSingle();
        if (bookingError) {
            throw bookingError;
        }
        const latestBooking = booking as CompletedBookingRecord | null;
        if (!latestBooking?.service_id) {
            return getFeaturedWorkers(5);
        }
        const { data: service, error: serviceError } = await supabase
            .from("services")
            .select("category")
            .eq("id", latestBooking.service_id)
            .maybeSingle();
        if (serviceError) {
            throw serviceError;
        }
        const category = (service as ServiceCategoryRecord | null)?.category;
        if (!category) {
            return getFeaturedWorkers(5);
        }
        const { data, error } = await supabase
            .from("profiles")
            .select(WORKER_WITH_SERVICES_SELECT)
            .eq("role", "worker")
            .eq("status", WORKER_STATUS.APPROVED);
        if (error) {
            throw error;
        }
        return (data ?? [])
            .map(normalizeWorkerWithServices)
            .filter((worker) => worker.services.some((workerService) => workerService.category === category));
    });
}
// =============================
// ADMIN WORKER MANAGEMENT
// =============================
export interface AdminWorkerListItem extends WorkerProfile {
    full_name: string;
    avatar: string | null;
    normalized_status: WorkerStatus;
    average_rating: number;
    completed_jobs: number;
}
export interface WorkerBookingSummary {
    id: number;
    customer_id: string;
    customer_name: string;
    service_name: string | null;
    booking_date: string | null;
    booking_time: string | null;
    status: string;
    created_at: string | null;
}
export interface WorkerReviewSummary {
    id: number;
    booking_id: number;
    customer_id: string;
    customer_name: string;
    rating: number;
    review: string | null;
    created_at: string | null;
}
export function normalizeWorkerStatus(value?: string | null): WorkerStatus {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();
    switch (normalized) {
        case "approved":
        case "active":
        case "verified":
            return WORKER_STATUS.APPROVED;
        case "rejected":
        case "declined":
            return WORKER_STATUS.REJECTED;
        case "disabled":
        case "inactive":
        case "suspended":
            return WORKER_STATUS.DISABLED;
        case "blocked":
        case "banned":
            return WORKER_STATUS.BLOCKED;
        case "pending":
        case "verification":
        default:
            return WORKER_STATUS.PENDING;
    }
}
export function getWorkerFullName(worker: WorkerProfile): string {
    return ([worker.first_name, worker.middle_name, worker.last_name]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(" ") ||
        worker.email ||
        "Unnamed worker");
}
export function getWorkerAvatar(worker: WorkerProfile): string | null {
    return (worker.profile_picture?.trim() ||
        worker.profile_image?.trim() ||
        worker.avatar_url?.trim() ||
        null);
}
function relationName(value: unknown, fallback: string): string {
    const relation = Array.isArray(value) ? value[0] : value;
    if (!relation || typeof relation !== "object")
        return fallback;
    const row = relation as Record<string, unknown>;
    return ([row.first_name, row.middle_name, row.last_name]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ") ||
        String(row.email ?? "").trim() ||
        fallback);
}
export async function getAdminWorkers(search = "", status: WorkerStatus | "All" = "All"): Promise<AdminWorkerListItem[]> {
    return await runAuditedProcess({ module: "Workers", process: "getAdminWorkers", action: "READ", parameters: { search, status } }, async () => {
        const workers = await getWorkers(search, status);
        if (!workers.length)
            return [];
        const ids = workers.map((worker) => worker.id);
        const [reviewsResult, bookingsResult] = await Promise.all([
            supabase.from("reviews").select("worker_id, rating").in("worker_id", ids),
            supabase.from("bookings").select("worker_id, status").in("worker_id", ids),
        ]);
        if (reviewsResult.error)
            throw reviewsResult.error;
        if (bookingsResult.error)
            throw bookingsResult.error;
        const ratings = new Map<string, number[]>();
        for (const item of reviewsResult.data ?? []) {
            const row = item as {
                worker_id: string;
                rating: number | string | null;
            };
            const rating = Number(row.rating);
            if (!Number.isFinite(rating))
                continue;
            ratings.set(row.worker_id, [...(ratings.get(row.worker_id) ?? []), rating]);
        }
        const completed = new Map<string, number>();
        for (const item of bookingsResult.data ?? []) {
            const row = item as {
                worker_id: string;
                status: string | null;
            };
            if (String(row.status ?? "")
                .trim()
                .toLowerCase() === "completed") {
                completed.set(row.worker_id, (completed.get(row.worker_id) ?? 0) + 1);
            }
        }
        return workers.map((worker) => {
            const values = ratings.get(worker.id) ?? [];
            const average = values.length
                ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
                : 0;
            return {
                ...worker,
                full_name: getWorkerFullName(worker),
                avatar: getWorkerAvatar(worker),
                normalized_status: normalizeWorkerStatus(worker.status),
                average_rating: average,
                completed_jobs: completed.get(worker.id) ?? 0,
            };
        });
    });
}
export async function setWorkerStatus(workerId: string, status: WorkerStatus): Promise<WorkerProfile> {
    return await runAuditedProcess({ module: "Workers", process: "setWorkerStatus", action: "UPDATE", parameters: { workerId, status } }, async () => {
        const normalized = normalizeWorkerStatus(status);
        if (normalized === WORKER_STATUS.REJECTED) {
            const rejected = await rejectWorker(workerId);
            return rejected[0];
        }
        const labels: Record<WorkerStatus, [
            string,
            string,
            string,
            string
        ]> = {
            [WORKER_STATUS.APPROVED]: [
                "APPROVED",
                "Worker account approved",
                "Account Approved",
                "Your worker account has been approved.",
            ],
            [WORKER_STATUS.REJECTED]: [
                "REJECTED",
                "Worker account rejected",
                "Account Rejected",
                "Your worker registration has been rejected.",
            ],
            [WORKER_STATUS.PENDING]: [
                "PENDING",
                "Worker account moved to pending",
                "Account Pending",
                "Your worker account is pending administrator review.",
            ],
            [WORKER_STATUS.DISABLED]: [
                "DISABLED",
                "Worker account disabled",
                "Account Disabled",
                "Your worker account has been disabled. Contact the administrator for assistance.",
            ],
            [WORKER_STATUS.BLOCKED]: [
                "BLOCKED",
                "Worker account blocked",
                "Account Blocked",
                "Your worker account has been blocked. Contact the administrator for assistance.",
            ],
        };
        const [action, description, title, message] = labels[normalized];
        const rows = await updateWorkerStatus(workerId, normalized, action, description, title, message);
        return rows[0];
    });
}
export async function getWorkerBookings(workerId: string): Promise<WorkerBookingSummary[]> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkerBookings", action: "READ", parameters: { workerId } }, async () => {
        const id = validateWorkerId(workerId);
        const { data, error } = await supabase
            .from("bookings")
            .select(`id, customer_id, service_name, booking_date, booking_time, status, created_at,
      customer:profiles!customer_id(first_name, middle_name, last_name, email)`)
            .eq("worker_id", id)
            .order("created_at", { ascending: false })
            .limit(50);
        if (error)
            throw error;
        return (data ?? []).map((item) => {
            const row = item as unknown as Record<string, unknown>;
            return {
                id: Number(row.id),
                customer_id: String(row.customer_id ?? ""),
                customer_name: relationName(row.customer, "Unknown customer"),
                service_name: row.service_name ? String(row.service_name) : null,
                booking_date: row.booking_date ? String(row.booking_date) : null,
                booking_time: row.booking_time ? String(row.booking_time) : null,
                status: String(row.status ?? "Unknown"),
                created_at: row.created_at ? String(row.created_at) : null,
            };
        });
    });
}
export async function getWorkerReviews(workerId: string): Promise<WorkerReviewSummary[]> {
    return await runAuditedProcess({ module: "Workers", process: "getWorkerReviews", action: "READ", parameters: { workerId } }, async () => {
        const id = validateWorkerId(workerId);
        const { data, error } = await supabase
            .from("reviews")
            .select(`id, booking_id, customer_id, rating, review, created_at,
      customer:profiles!customer_id(first_name, middle_name, last_name, email)`)
            .eq("worker_id", id)
            .order("created_at", { ascending: false })
            .limit(50);
        if (error)
            throw error;
        return (data ?? []).map((item) => {
            const row = item as unknown as Record<string, unknown>;
            return {
                id: Number(row.id),
                booking_id: Number(row.booking_id),
                customer_id: String(row.customer_id ?? ""),
                customer_name: relationName(row.customer, "Unknown customer"),
                rating: Number(row.rating ?? 0),
                review: row.review ? String(row.review) : null,
                created_at: row.created_at ? String(row.created_at) : null,
            };
        });
    });
}
// Worker online presence helpers
export { getWorkerBookability, getWorkerOnlineStatus, getWorkersOnlineStatus, } from "./presenceService";
