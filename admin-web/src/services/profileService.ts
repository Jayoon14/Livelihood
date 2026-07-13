import { supabase } from "../lib/supabase";


// =========================
// GET PROFILE
// =========================
export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// =========================
// UPDATE PROFILE
// =========================
export async function updateProfile(
  id: string,
  updates: any
) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw error;
  }
}


// =========================
// UPLOAD PROFILE PHOTO
// =========================
export async function uploadAvatar(
  userId: string,
  file: File
) {

  const fileExt = file.name
    .split(".")
    .pop();

  const fileName =
    `${userId}-${Date.now()}.${fileExt}`;


  // Upload image to Storage
  const {
    error: uploadError
  } = await supabase.storage
    .from("avatars")
    .upload(
      fileName,
      file,
      {
        upsert: true,
      }
    );


  if (uploadError) {
    throw uploadError;
  }


  // Get public URL
  const {
    data
  } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);


  const publicUrl = data.publicUrl;


  console.log(
    "Uploaded Image:",
    publicUrl
  );


  // Save URL to profiles table
  const {
    data: updatedProfile,
    error: updateError
  } = await supabase
    .from("profiles")
    .update({
      profile_image: publicUrl,
    })
    .eq("id", userId)
    .select()
    .single();


  console.log(
    "Updated Profile:",
    updatedProfile
  );


  if (updateError) {
    throw updateError;
  }


  return publicUrl;
}