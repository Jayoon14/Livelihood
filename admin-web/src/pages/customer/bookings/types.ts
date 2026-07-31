export type WorkerSummary = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
};

export type ServiceSummary = {
  service_name?: string | null;
};

export type CompletionProofImage = {
  id: number;
  image_url: string;
};

export type CompletionProofData = {
  id: number;
  booking_id: number;
  worker_id: string;
  summary: string;
  notes?: string | null;
  hours_worked?: number | string | null;
  created_at?: string | null;
  images: CompletionProofImage[];
};

export type CustomerBooking = {
  id: number;
  customer_id: string;
  worker_id: string;
  service_id: number | string;
  status: string;
  trip_status?: string | null;
  completion_status?: string | null;
  payment_status?: string | null;
  price?: number | null;
  booking_date: string;
  booking_time: string;
  created_at: string;
  address?: string | null;
  customer_address?: string | null;
  notes?: string | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  payment_reference?: string | null;
  payment_date?: string | null;
  transaction_id?: string | null;
  customer_deleted?: boolean | null;
  reviewed: boolean;
  worker?: WorkerSummary | null;
  services?: ServiceSummary | null;
};

export type BookingAction = "cancel" | "delete" | "review" | "rebook";
