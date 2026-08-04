import { supabase } from "../lib/supabase";

const DB_NAME = "livelihoodgo-registration";
const STORE_NAME = "pending-worker-files";
const DB_VERSION = 2;

const MAX_PROFILE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const PROFILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export interface PendingWorkerFilesInput {
  profilePicture?: File | null;
  validId?: File | null;
  resume?: File | null;
  tesdaCertificate?: File | null;
  barangayClearance?: File | null;
  policeClearance?: File | null;
  nbiClearance?: File | null;

  highestEducation?: string | null;
  elementary?: string | null;
  secondary?: string | null;
  seniorHigh?: string | null;
  college?: string | null;
  course?: string | null;
  yearGraduated?: string | null;
  tesda?: string | null;
  prc?: string | null;
  trainings?: string | null;

  noWorkExperience?: boolean;
  company?: string | null;
  position?: string | null;
  employmentStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;

  skills?: string[];
}

interface PendingWorkerFilesRecord
  extends PendingWorkerFilesInput {
  email: string;
  savedAt: number;
}

export interface WorkerFileUploadResult {
  profilePictureUrl: string | null;
  documentsSaved: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(STORE_NAME)
      ) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "email",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error(
            "Unable to open pending worker file storage.",
          ),
      );
  });
}

function validateProfilePicture(file: File): void {
  if (!PROFILE_TYPES.has(file.type)) {
    throw new Error(
      "Worker profile picture must be JPG, PNG, or WEBP.",
    );
  }

  if (file.size <= 0 || file.size > MAX_PROFILE_SIZE) {
    throw new Error(
      "Worker profile picture must be 5 MB or smaller.",
    );
  }
}

function validateDocument(
  file: File,
  label: string,
): void {
  if (!DOCUMENT_TYPES.has(file.type)) {
    throw new Error(
      `${label} must be a JPG, PNG, or PDF file.`,
    );
  }

  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(
      `${label} must be 10 MB or smaller.`,
    );
  }
}

function fileExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase();

  if (extension === "jpeg") {
    return "jpg";
  }

  if (
    extension === "jpg" ||
    extension === "png" ||
    extension === "webp" ||
    extension === "pdf"
  ) {
    return extension;
  }

  throw new Error("Invalid worker file extension.");
}

function validateFiles(
  files: PendingWorkerFilesInput,
): void {
  if (files.profilePicture) {
    validateProfilePicture(files.profilePicture);
  }

  const documents: Array<
    [File | null | undefined, string]
  > = [
    [files.validId, "Valid ID"],
    [files.resume, "Resume"],
    [files.tesdaCertificate, "TESDA certificate"],
    [files.barangayClearance, "Barangay clearance"],
    [files.policeClearance, "Police clearance"],
    [files.nbiClearance, "NBI clearance"],
  ];

  for (const [file, label] of documents) {
    if (file) {
      validateDocument(file, label);
    }
  }
}

export async function savePendingWorkerFiles(
  email: string,
  files: PendingWorkerFilesInput,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error(
      "Worker email is required before saving files.",
    );
  }

  validateFiles(files);

  const hasAnyData =
    Boolean(files.profilePicture) ||
    Boolean(files.validId) ||
    Boolean(files.resume) ||
    Boolean(files.tesdaCertificate) ||
    Boolean(files.barangayClearance) ||
    Boolean(files.policeClearance) ||
    Boolean(files.nbiClearance) ||
    Boolean(files.highestEducation?.trim()) ||
    Boolean(files.company?.trim()) ||
    Boolean(files.skills?.length);

  if (!hasAnyData) {
    return;
  }

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction.objectStore(STORE_NAME).put({
      email: normalizedEmail,
      ...files,
      savedAt: Date.now(),
    } satisfies PendingWorkerFilesRecord);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Unable to save pending worker files.",
          ),
      );
  });

  database.close();
}

async function getPendingWorkerFiles(
  email: string,
): Promise<PendingWorkerFilesRecord | null> {
  const database = await openDatabase();

  const result = await new Promise<
    PendingWorkerFilesRecord | undefined
  >((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readonly",
    );

    const request = transaction
      .objectStore(STORE_NAME)
      .get(normalizeEmail(email));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error(
            "Unable to read pending worker files.",
          ),
      );
  });

  database.close();
  return result ?? null;
}

async function deletePendingWorkerFiles(
  email: string,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction
      .objectStore(STORE_NAME)
      .delete(normalizeEmail(email));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Unable to clear pending worker files.",
          ),
      );
  });

  database.close();
}

async function uploadFile(
  bucket: "profile-picture" | "worker-documents",
  userId: string,
  folder: string,
  file: File,
): Promise<{
  path: string;
  publicUrl: string;
}> {
  const extension = fileExtension(file);
  const path =
    `${userId}/${folder}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Unable to upload ${folder}: ${error.message}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl,
  };
}

function optionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function savePendingWorkerProfileData(
  userId: string,
  pending: PendingWorkerFilesRecord,
): Promise<void> {
  const { error: educationError } = await supabase
    .from("education")
    .upsert(
      {
        profile_id: userId,
        highest_attainment: optionalText(
          pending.highestEducation,
        ),
        elementary: optionalText(pending.elementary),
        secondary: optionalText(pending.secondary),
        senior_high: optionalText(pending.seniorHigh),
        college: optionalText(pending.college),
        course: optionalText(pending.course),
        year_graduated: optionalText(
          pending.yearGraduated,
        ),
        tesda: optionalText(pending.tesda),
        prc: optionalText(pending.prc),
        trainings: optionalText(pending.trainings),
      },
      {
        onConflict: "profile_id",
      },
    );

  if (educationError) {
    throw new Error(
      `Unable to save education: ${educationError.message}`,
    );
  }

  const { error: deleteSkillsError } = await supabase
    .from("worker_skills")
    .delete()
    .eq("profile_id", userId);

  if (deleteSkillsError) {
    throw new Error(
      `Unable to refresh worker skills: ${deleteSkillsError.message}`,
    );
  }

  const normalizedSkills = (pending.skills ?? [])
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (normalizedSkills.length > 0) {
    const { error: skillsError } = await supabase
      .from("worker_skills")
      .insert(
        normalizedSkills.map((skill) => ({
          profile_id: userId,
          skill_name: skill,
        })),
      );

    if (skillsError) {
      throw new Error(
        `Unable to save worker skills: ${skillsError.message}`,
      );
    }
  }

  const { error: deleteWorkError } = await supabase
    .from("work_experience")
    .delete()
    .eq("profile_id", userId);

  if (deleteWorkError) {
    throw new Error(
      `Unable to refresh work experience: ${deleteWorkError.message}`,
    );
  }

  if (
    !pending.noWorkExperience &&
    optionalText(pending.company)
  ) {
    const { error: workError } = await supabase
      .from("work_experience")
      .insert({
        profile_id: userId,
        company: optionalText(pending.company),
        position: optionalText(pending.position),
        employment_status: optionalText(
          pending.employmentStatus,
        ),
        start_date: optionalText(pending.startDate),
        end_date: optionalText(pending.endDate),
        description: optionalText(pending.description),
      });

    if (workError) {
      throw new Error(
        `Unable to save work experience: ${workError.message}`,
      );
    }
  }
}

export async function uploadPendingWorkerFiles(
  userId: string,
  email: string,
): Promise<WorkerFileUploadResult | null> {
  const pending = await getPendingWorkerFiles(email);

  if (!pending) {
    return null;
  }

  validateFiles(pending);

  const uploaded: Array<{
    bucket: "profile-picture" | "worker-documents";
    path: string;
  }> = [];

  try {
    let profilePictureUrl: string | null = null;

    if (pending.profilePicture) {
      const result = await uploadFile(
        "profile-picture",
        userId,
        "profile",
        pending.profilePicture,
      );

      profilePictureUrl = result.publicUrl;
      uploaded.push({
        bucket: "profile-picture",
        path: result.path,
      });

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          profile_picture: profilePictureUrl,
        })
        .eq("id", userId);

      if (profileError) {
        throw new Error(
          `Unable to save worker profile picture: ${profileError.message}`,
        );
      }
    }

    const documentFiles = [
      {
        column: "valid_id",
        folder: "valid-id",
        file: pending.validId,
      },
      {
        column: "resume",
        folder: "resume",
        file: pending.resume,
      },
      {
        column: "tesda_certificate",
        folder: "tesda-certificate",
        file: pending.tesdaCertificate,
      },
      {
        column: "barangay_clearance",
        folder: "barangay-clearance",
        file: pending.barangayClearance,
      },
      {
        column: "police_clearance",
        folder: "police-clearance",
        file: pending.policeClearance,
      },
      {
        column: "nbi_clearance",
        folder: "nbi-clearance",
        file: pending.nbiClearance,
      },
    ] as const;

    const documentValues: Record<string, string | null> = {
      valid_id: null,
      resume: null,
      tesda_certificate: null,
      barangay_clearance: null,
      police_clearance: null,
      nbi_clearance: null,
    };

    for (const document of documentFiles) {
      if (!document.file) {
        continue;
      }

      const result = await uploadFile(
        "worker-documents",
        userId,
        document.folder,
        document.file,
      );

      documentValues[document.column] = result.publicUrl;
      uploaded.push({
        bucket: "worker-documents",
        path: result.path,
      });
    }

    const hasDocuments = Object.values(
      documentValues,
    ).some(Boolean);

    if (hasDocuments) {
      const { error: documentsError } = await supabase
        .from("documents")
        .upsert(
          {
            profile_id: userId,
            ...documentValues,
          },
          {
            onConflict: "profile_id",
          },
        );

      if (documentsError) {
        throw new Error(
          `Unable to save worker documents: ${documentsError.message}`,
        );
      }
    }

    await savePendingWorkerProfileData(
      userId,
      pending,
    );

    await deletePendingWorkerFiles(email);

    return {
      profilePictureUrl,
      documentsSaved: hasDocuments,
    };
  } catch (error) {
    await Promise.allSettled(
      uploaded.map(({ bucket, path }) =>
        supabase.storage.from(bucket).remove([path]),
      ),
    );

    throw error;
  }
}