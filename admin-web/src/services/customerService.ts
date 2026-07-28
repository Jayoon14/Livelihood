import { supabase } from "../lib/supabase";

export interface CustomerProfile {
  id: string;
  role: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  address: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  created_at: string | null;
  updated_at?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface Customer extends CustomerProfile {
  full_name: string;
  address: string;
}

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function requireCustomerId(id: string): string {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("Customer ID is required.");
  }

  return normalizedId;
}

function normalizeSearchTerm(search: string): string {
  return search
    .trim()
    .replace(/[%(),]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function buildFullName(customer: CustomerProfile): string {
  return [
    customer.first_name,
    customer.middle_name,
    customer.last_name,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function buildFullAddress(customer: CustomerProfile): string {
  return [
    customer.address,
    customer.barangay,
    customer.municipality,
    customer.province,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function mapCustomer(customer: CustomerProfile): Customer {
  return {
    ...customer,
    full_name: buildFullName(customer),
    address: buildFullAddress(customer),
  };
}

export async function getCustomers(
  search = "",
): Promise<Customer[]> {
  const normalizedSearch = normalizeSearchTerm(search);

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (normalizedSearch) {
    query = query.or(
      [
        `first_name.ilike.%${normalizedSearch}%`,
        `last_name.ilike.%${normalizedSearch}%`,
        `email.ilike.%${normalizedSearch}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw wrapError(error, "Unable to load customers.");
  }

  return ((data ?? []) as CustomerProfile[]).map(mapCustomer);
}

export async function getCustomer(
  id: string,
): Promise<Customer> {
  const customerId = requireCustomerId(id);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", customerId)
    .eq("role", "customer")
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load the customer.");
  }

  if (!data) {
    throw new Error("Customer not found.");
  }

  return mapCustomer(data as CustomerProfile);
}