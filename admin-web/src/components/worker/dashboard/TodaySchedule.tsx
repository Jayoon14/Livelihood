import { Calendar, Clock, MapPin, User } from "lucide-react";

interface Props {
  bookings: any[];
}

export default function TodaySchedule({ bookings }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const todayBookings = bookings.filter(
    (booking) =>
      booking.booking_date === today && booking.status === "Approved",
  );

  return (
    <div className="mt-12">
      <div
        className="
          bg-white
          rounded-3xl
          border
          border-gray-100
          shadow-sm
          p-8
          max-w-6xl
          mx-auto
        "
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Today's Schedule
            </h2>

            <p className="text-gray-500 mt-1">Approved bookings for today</p>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl">
            <Calendar size={36} className="text-blue-600" />
          </div>
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <Calendar size={56} className="text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold mt-6">No Schedule Today</h2>

            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              You don't have any approved bookings for today. Enjoy your free
              time or check upcoming requests.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {todayBookings.map((booking) => (
              <div
                key={booking.id}
                className="
                  bg-gray-50
                  rounded-2xl
                  p-6
                  hover:bg-white
                  hover:shadow-lg
                  transition
                  border
                  border-gray-100
                "
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User size={20} className="text-blue-600" />

                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          {booking.customer?.first_name}{" "}
                          {booking.customer?.last_name}
                        </h3>

                        <p className="text-gray-500">
                          {booking.service?.service_name ?? "Service"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <Clock size={18} className="text-blue-600" />
                      <span>{booking.booking_time}</span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-700">
                      <MapPin size={18} className="text-red-500" />
                      <span>{booking.address}</span>
                    </div>
                  </div>

                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                    Approved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
