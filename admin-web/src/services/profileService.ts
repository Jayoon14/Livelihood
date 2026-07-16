import { supabase } from "../lib/supabase";


// =========================
// GET PROFILE
// =========================
export async function getProfile(id: string) {

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();


  if (error) {

    console.error(
      "GET PROFILE ERROR:",
      error
    );

    throw error;

  }


  console.log(
    "PROFILE DATA:",
    data
  );


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

    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

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


  const fileExt =
    file.name.split(".").pop();


  const fileName =
    `${userId}-${Date.now()}.${fileExt}`;



  // Upload to Storage

  const {
    error: uploadError
  } = await supabase.storage
    .from("avatars")
    .upload(
      fileName,
      file,
      {
        upsert:true,
      }
    );



  if(uploadError){

    console.error(
      "UPLOAD ERROR:",
      uploadError
    );

    throw uploadError;

  }



  // Get public URL

  const {
    data:urlData
  } = supabase.storage
    .from("avatars")
    .getPublicUrl(
      fileName
    );


  const publicUrl =
    urlData.publicUrl;



  console.log(
    "IMAGE URL:",
    publicUrl
  );




  // Save image URL

  const {
    data:updatedProfile,
    error:updateError

  } = await supabase
    .from("profiles")
    .update({
      profile_picture: publicUrl,
    })
    .eq("id", userId)
    .select()
    .maybeSingle();



  if(updateError){

    console.error(
      "SAVE IMAGE ERROR:",
      updateError
    );

    throw updateError;

  }



  console.log(
    "UPDATED PROFILE:",
    updatedProfile
  );



  return publicUrl;

}