import { supabase } from "../lib/supabase";

export async function getCustomers(search = "") {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (search.trim() !== "") {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}