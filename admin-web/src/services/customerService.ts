import { supabase } from "../lib/supabase";

export async function getCustomers(search = "") {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (search.trim() !== "") {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((customer) => ({
    ...customer,

    full_name: [
      customer.first_name,
      customer.middle_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" "),

    address: [
      customer.address,
      customer.barangay,
      customer.municipality,
      customer.province,
    ]
      .filter(Boolean)
      .join(", "),
  }));
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,

    full_name: [
      data.first_name,
      data.middle_name,
      data.last_name,
    ]
      .filter(Boolean)
      .join(" "),

    address: [
      data.address,
      data.barangay,
      data.municipality,
      data.province,
    ]
      .filter(Boolean)
      .join(", "),
  };
}