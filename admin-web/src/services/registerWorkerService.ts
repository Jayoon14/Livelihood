import { supabase } from "../lib/supabase";
import type { RegisterData } from "../store/registerStore";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function wrapError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(fallback);
}

function requireText(value: string, field: string): string {
  const v = value.trim();
  if (!v) throw new Error(`${field} is required.`);
  return v;
}

async function uploadDocument(
  file: File | null | undefined,
  folder: string,
  userId: string,
): Promise<string | null> {
  if (!file) return null;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) throw new Error("Invalid file format.");
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and PDF files are allowed.");
  }
  if (file.size > MAX_FILE_SIZE) throw new Error("Maximum file size is 10 MB.");
  const path = `${userId}/${folder}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("worker-documents")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw wrapError(error, "Document upload failed.");
  return supabase.storage.from("worker-documents").getPublicUrl(path).data
    .publicUrl;
}

export async function submitWorkerRegistration(
  data: RegisterData,
): Promise<{ userId: string; message: string }> {
  requireText(data.email, "Email");
  requireText(data.password, "Password");
  requireText(data.firstName, "First name");
  requireText(data.lastName, "Last name");

  const { data: auth, error: authError } = await supabase.auth.signUp({
    email: data.email.trim(),
    password: data.password,
  });
  if (authError) throw wrapError(authError, "Unable to create account.");
  if (!auth.user) throw new Error("Unable to create account.");

  const userId = auth.user.id;

  const profilePicture = await uploadDocument(
    data.profilePicture,
    "profile-picture",
    userId,
  );

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "worker",
    email: data.email.trim(),
    first_name: data.firstName.trim(),
    middle_name: data.middleName?.trim() || "",
    last_name: data.lastName.trim(),
    suffix: data.suffix?.trim() || "",
    birth_date: data.birthDate,
    gender: data.gender,
    civil_status: data.civilStatus,
    religion: data.religion,
    phone: data.phone?.trim() || "",
    address: `${data.houseNo} ${data.street}`.trim(),
    barangay: data.barangay,
    municipality: data.municipality,
    province: data.province,
    status: "Pending",
    profile_picture: profilePicture,
  });
  if (profileError) throw wrapError(profileError, "Unable to save profile.");

  const { error: eduError } = await supabase.from("education").insert({
    profile_id: userId,
    highest_attainment: data.highestEducation,
    elementary: data.elementary,
    secondary: data.secondary,
    senior_high: data.seniorHigh,
    college: data.college,
    course: data.course,
    year_graduated: data.yearGraduated,
    tesda: data.tesda,
    prc: data.prc,
    trainings: data.trainings,
  });
  if (eduError) throw wrapError(eduError, "Unable to save education.");

  if (!data.noWorkExperience) {
    const { error } = await supabase.from("work_experience").insert({
      profile_id: userId,
      company: data.company,
      position: data.position,
      employment_status: data.employmentStatus,
      start_date: data.startDate,
      end_date: data.endDate,
      description: data.description,
    });
    if (error) throw wrapError(error, "Unable to save work experience.");
  }

  if (data.skills?.length) {
    const { error } = await supabase
      .from("worker_skills")
      .insert(
        data.skills.map((skill) => ({
          profile_id: userId,
          skill_name: skill.trim(),
        })),
      );
    if (error) throw wrapError(error, "Unable to save skills.");
  }

  const docs = {
    valid_id: await uploadDocument(data.validId, "valid-id", userId),
    resume: await uploadDocument(data.resume, "resume", userId),
    tesda_certificate: await uploadDocument(
      data.tesdaCertificate,
      "tesda-certificate",
      userId,
    ),
    barangay_clearance: await uploadDocument(
      data.barangayClearance,
      "barangay-clearance",
      userId,
    ),
    police_clearance: await uploadDocument(
      data.policeClearance,
      "police-clearance",
      userId,
    ),
    nbi_clearance: await uploadDocument(
      data.nbiClearance,
      "nbi-clearance",
      userId,
    ),
  };

  const { error: docError } = await supabase.from("documents").insert({
    profile_id: userId,
    ...docs,
  });
  if (docError) throw wrapError(docError, "Unable to save documents.");

  return { userId, message: "Registration successful." };
}
