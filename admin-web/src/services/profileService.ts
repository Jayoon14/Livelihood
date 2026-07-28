import { supabase } from "../lib/supabase";

export interface WorkerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  profile_picture: string | null;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  profile_picture?: string;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function message(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return new Error(error.message);
  }
  return new Error(fallback);
}

export async function getProfile(id: string): Promise<WorkerProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw message(error, "Unable to load profile.");
  }

  return data as WorkerProfile | null;
}

export async function updateProfile(
  id: string,
  updates: UpdateProfileRequest,
): Promise<WorkerProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw message(error, "Unable to update profile.");
  }

  return data as WorkerProfile;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension) {
    throw new Error("Invalid image filename.");
  }

  const fileName = `${userId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    throw message(uploadError, "Unable to upload image.");
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  const publicUrl = data.publicUrl;

  if (!publicUrl) {
    throw new Error("Unable to generate public image URL.");
  }

  await updateProfile(userId, {
    profile_picture: publicUrl,
  });

  return publicUrl;
}