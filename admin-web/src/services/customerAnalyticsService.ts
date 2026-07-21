import { supabase } from "../lib/supabase";

export async function getCustomerAnalytics(customerId: string) {
  const [bookings, favorites, payments] = await Promise.all([
    supabase.from("bookings").select("status").eq("customer_id", customerId),

    supabase
      .from("favorites")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("customer_id", customerId),

    supabase
      .from("payments")
      .select("amount")
      .eq("customer_id", customerId)
      .eq("payment_status", "Paid"),
  ]);

  const bookingData = bookings.data ?? [];

  return {
    totalBookings: bookingData.length,

    completedBookings: bookingData.filter((b) => b.status === "Completed")
      .length,

    pendingBookings: bookingData.filter((b) => b.status === "Pending").length,

    cancelledBookings: bookingData.filter((b) => b.status === "Cancelled")
      .length,

    favoriteWorkers: favorites.count ?? 0,

    totalPayments: (payments.data ?? []).reduce(
      (sum, p: any) => sum + Number(p.amount),
      0,
    ),
  };
}
