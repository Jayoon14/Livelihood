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
  fullName: string,
  email: string,
  password: string,
  role: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { data: null, error };
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      email: email,
      role: role,
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
  const { data } = await supabase.auth.getUser();

  return data.user;
}