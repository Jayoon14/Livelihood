import { supabase } from "../lib/supabase";


export async function getReceipt(
  bookingId: number
) {

  console.log(
    "Searching receipt booking_id:",
    bookingId
  );


 const { data, error } = await supabase
  .from("payments")
  .select(`
    *,
    booking:bookings(
      id,
      service_name,
      category,
      booking_date,
      booking_time
    ),
    customer:profiles!customer_id(
      first_name,
      last_name
    ),
    worker:profiles!worker_id(
      first_name,
      last_name
    )
  `)
  .eq("booking_id", bookingId)
  .eq("payment_status", "Paid")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();



  console.log(
    "Receipt result:",
    data
  );


  console.log(
    "Receipt error:",
    error
  );



  if (error) {
    throw error;
  }



  if (!data) {
    throw new Error(
      "Receipt not found."
    );
  }



  return data;
}