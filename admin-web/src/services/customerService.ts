import { supabase } from "../lib/supabase";

export const CUSTOMER_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DISABLED: "Disabled",
  BLOCKED: "Blocked",
  REJECTED: "Rejected",
} as const;

export type CustomerStatus =
  (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];

export interface CustomerProfile {
  id: string;
  role: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix?: string | null;
  email: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  profile_image?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  civil_status?: string | null;
  religion?: string | null;
  house_no?: string | null;
  street?: string | null;
  address: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  created_at: string | null;
  status?: string | null;
}

export interface Customer extends CustomerProfile {
  full_name: string;
  full_address: string;
  avatar: string | null;
  normalized_status: CustomerStatus;
}

export interface CustomerBookingSummary {
  id: number;
  worker_id: string;
  status: string;
  booking_date: string | null;
  booking_time: string | null;
  created_at: string | null;
  service_name: string | null;
  worker_name: string;
}

export interface CustomerReviewSummary {
  id: number;
  booking_id: number;
  worker_id: string;
  rating: number;
  review: string | null;
  created_at: string | null;
  worker_name: string;
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

export function normalizeCustomerStatus(
  status?: string | null,
): CustomerStatus {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  switch (normalized) {
    case "approved":
    case "active":
    case "verified":
      return CUSTOMER_STATUS.APPROVED;

    case "disabled":
    case "inactive":
    case "suspended":
      return CUSTOMER_STATUS.DISABLED;

    case "blocked":
    case "banned":
      return CUSTOMER_STATUS.BLOCKED;

    case "rejected":
    case "declined":
      return CUSTOMER_STATUS.REJECTED;

    case "pending":
    case "verification":
    case "for verification":
    case "":
    default:
      return CUSTOMER_STATUS.PENDING;
  }
}

function validateCustomerStatus(status: string): CustomerStatus {
  const normalized = normalizeCustomerStatus(status);
  const allowed = Object.values(CUSTOMER_STATUS) as CustomerStatus[];

  if (!allowed.includes(normalized)) {
    throw new Error("Invalid customer status.");
  }

  return normalized;
}

function buildFullName(customer: CustomerProfile): string {
  return [
    customer.first_name,
    customer.middle_name,
    customer.last_name,
    customer.suffix,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function buildFullAddress(customer: CustomerProfile): string {
  const parts = [
    customer.house_no,
    customer.street,
    customer.address,
    customer.barangay,
    customer.municipality,
    customer.province,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return Array.from(new Set(parts)).join(", ");
}

export function getCustomerAvatar(
  customer: CustomerProfile,
): string | null {
  return (
    customer.profile_picture?.trim() ||
    customer.profile_image?.trim() ||
    customer.avatar_url?.trim() ||
    null
  );
}

function mapCustomer(customer: CustomerProfile): Customer {
  return {
    ...customer,
    full_name:
      buildFullName(customer) ||
      customer.email ||
      "Unnamed customer",
    full_address: buildFullAddress(customer),
    avatar: getCustomerAvatar(customer),
    normalized_status: normalizeCustomerStatus(customer.status),
  };
}

function relatedProfile(value: unknown): {
  id: string;
  name: string;
} {
  const profile = Array.isArray(value) ? value[0] : value;

  if (!profile || typeof profile !== "object") {
    return {
      id: "",
      name: "Unknown worker",
    };
  }

  const row = profile as Record<string, unknown>;

  const name = [
    row.first_name,
    row.middle_name,
    row.last_name,
    row.suffix,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return {
    id: String(row.id ?? "").trim(),
    name:
      name ||
      String(row.email ?? "").trim() ||
      "Unknown worker",
  };
}

const CUSTOMER_COLUMNS = `
  id,
  role,
  first_name,
  middle_name,
  last_name,
  suffix,
  email,
  phone,
  profile_picture,
  profile_image,
  avatar_url,
  gender,
  birth_date,
  civil_status,
  religion,
  house_no,
  street,
  address,
  barangay,
  municipality,
  province,
  created_at,
  status
`;

export async function getCustomers(
  search = "",
): Promise<Customer[]> {
  const normalizedSearch = normalizeSearchTerm(search);

  let query = supabase
    .from("profiles")
    .select(CUSTOMER_COLUMNS)
    .ilike("role", "customer")
    .order("created_at", { ascending: false });

  if (normalizedSearch) {
    query = query.or(
      [
        `first_name.ilike.%${normalizedSearch}%`,
        `middle_name.ilike.%${normalizedSearch}%`,
        `last_name.ilike.%${normalizedSearch}%`,
        `email.ilike.%${normalizedSearch}%`,
        `phone.ilike.%${normalizedSearch}%`,
        `address.ilike.%${normalizedSearch}%`,
        `barangay.ilike.%${normalizedSearch}%`,
        `municipality.ilike.%${normalizedSearch}%`,
        `province.ilike.%${normalizedSearch}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw wrapError(error, "Unable to load customers.");
  }

  return ((data ?? []) as CustomerProfile[]).map(mapCustomer);
}

export async function getCustomer(id: string): Promise<Customer> {
  const customerId = requireCustomerId(id);

  const { data, error } = await supabase
    .from("profiles")
    .select(CUSTOMER_COLUMNS)
    .eq("id", customerId)
    .ilike("role", "customer")
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load the customer.");
  }

  if (!data) {
    throw new Error("Customer not found.");
  }

  return mapCustomer(data as CustomerProfile);
}

export async function updateCustomerStatus(
  id: string,
  nextStatus: CustomerStatus,
): Promise<Customer> {
  const customerId = requireCustomerId(id);
  const normalizedStatus = validateCustomerStatus(nextStatus);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      status: normalizedStatus,
    })
    .eq("id", customerId)
    .ilike("role", "customer")
    .select(CUSTOMER_COLUMNS)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to update customer status.");
  }

  if (!data) {
    throw new Error(
      "Customer status update failed. The account may no longer exist.",
    );
  }

  return mapCustomer(data as CustomerProfile);
}

export async function getCustomerBookings(
  id: string,
): Promise<CustomerBookingSummary[]> {
  const customerId = requireCustomerId(id);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        worker_id,
        status,
        booking_date,
        booking_time,
        created_at,
        service_name,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw wrapError(error, "Unable to load booking history.");
  }

  return (data ?? []).map((value) => {
    const row = value as unknown as Record<string, unknown>;
    const worker = relatedProfile(row.worker);

    return {
      id: Number(row.id),
      worker_id:
        String(row.worker_id ?? "").trim() || worker.id,
      status: String(row.status ?? "Unknown"),
      booking_date: row.booking_date
        ? String(row.booking_date)
        : null,
      booking_time: row.booking_time
        ? String(row.booking_time)
        : null,
      created_at: row.created_at
        ? String(row.created_at)
        : null,
      service_name: row.service_name
        ? String(row.service_name)
        : null,
      worker_name: worker.name,
    };
  });
}

export async function getCustomerReviews(
  id: string,
): Promise<CustomerReviewSummary[]> {
  const customerId = requireCustomerId(id);

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
        id,
        booking_id,
        worker_id,
        rating,
        review,
        created_at,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw wrapError(error, "Unable to load customer reviews.");
  }

  return (data ?? []).map((value) => {
    const row = value as unknown as Record<string, unknown>;
    const worker = relatedProfile(row.worker);

    return {
      id: Number(row.id),
      booking_id: Number(row.booking_id),
      worker_id:
        String(row.worker_id ?? "").trim() || worker.id,
      rating: Number(row.rating ?? 0),
      review: row.review ? String(row.review) : null,
      created_at: row.created_at
        ? String(row.created_at)
        : null,
      worker_name: worker.name,
    };
  });
}