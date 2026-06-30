import { supabase } from "../lib/supabase";

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    data,
    error,
  };
}

export async function registerUser(
  firstName: string,
  middleName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  role: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      data: null,
      error,
    };
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email,
        phone,
        role,
        status: role === "customer" ? "Approved" : "Pending",
      });

    if (profileError) {
      return {
        data: null,
        error: profileError,
      };
    }
  }

  return {
    data,
    error: null,
  };
}

export async function logout() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    error,
  };
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  return {
    session,
    error,
  };
}