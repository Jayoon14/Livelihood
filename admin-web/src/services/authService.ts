import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";


// =========================
// LOGIN
// =========================

export async function login(
  email: string,
  password: string
) {
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    data,
    error,
  };
}



// =========================
// REGISTER USER
// =========================

type RegisterData = {
  firstName: string;
  middleName?: string;
  lastName: string;

  email: string;
  phone: string;

  password: string;

  gender?: string;
  birthDate?: string;
  civilStatus?: string;
  religion?: string;

  houseNo?: string;
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;

  profilePicture?: File | null;

  role: string;
};


export async function registerUser(
  userData: RegisterData
) {

  const {
    firstName,
    middleName,
    lastName,

    email,
    phone,

    password,

    gender,
    birthDate,
    civilStatus,
    religion,

    houseNo,
    street,
    barangay,
    municipality,
    province,

    profilePicture,

    role,

  } = userData;



  // =========================
  // CREATE AUTH USER
  // =========================

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email,
    password,
  });


  if (error) {
    return {
      data: null,
      error,
    };
  }


  if (!data.user) {
    return {
      data: null,
      error: new Error(
        "User creation failed."
      ),
    };
  }



  // =========================
  // UPLOAD PROFILE IMAGE
  // =========================

  let imageUrl = null;


  if (profilePicture) {

    const fileName =
      `${data.user.id}-${profilePicture.name}`;


    const {
      error: uploadError,
    } = await supabase.storage
      .from("profile-picture")
      .upload(
        fileName,
        profilePicture
      );


    if (uploadError) {
      return {
        data: null,
        error: uploadError,
      };
    }


    const {
      data: imageData,
    } = supabase.storage
      .from("profile-picture")
      .getPublicUrl(fileName);


    imageUrl =
      imageData.publicUrl;
  }
  // =========================
// SAVE PROFILE
// =========================

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .insert({

      id: data.user.id,

      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,

      email,
      phone,

      gender,
      birth_date: birthDate,
      civil_status: civilStatus,
      religion,

      house_no: houseNo,
      street,
      barangay,
      municipality,
      province,

      profile_picture: imageUrl,

      role,

      status:
        role === "customer"
          ? "Approved"
          : "Pending",

    });



  if (profileError) {
    return {
      data: null,
      error: profileError,
    };
  }



  // =========================
  // LOG REGISTER ACTIVITY
  // =========================

  await logActivity(
    data.user.id,
    "REGISTER",
    "Authentication",
    `${firstName} ${lastName} registered as ${role}`
  );



  return {
    data,
    error: null,
  };

}



// =========================
// LOGOUT
// =========================

export async function logout() {

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();



  if (user) {

    await logActivity(
      user.id,
      "LOGOUT",
      "Authentication",
      "User logged out"
    );

  }



  return await supabase.auth.signOut();

}



// =========================
// GET CURRENT USER
// =========================

export async function getCurrentUser() {

  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();



  return {
    user,
    error,
  };

}



// =========================
// GET CURRENT SESSION
// =========================

export async function getCurrentSession() {

  const {
    data: {
      session,
    },
    error,
  } = await supabase.auth.getSession();



  return {
    session,
    error,
  };

}