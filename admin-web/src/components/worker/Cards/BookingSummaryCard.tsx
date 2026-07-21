import {
  Calendar,
  Clock3,
  Receipt,
  CreditCard,
  BadgeDollarSign,
} from "lucide-react";
interface Props {
  booking: any;
}

export default function BookingSummaryCard({ booking }: Props) {
  return (
    <div className="bg-white border rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Booking Summary</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Booking ID */}

        <div>
          <p className="flex items-center gap-2 text-gray-400 text-sm">
            <Receipt size={16} />
            Booking ID
          </p>

          <p className="font-semibold">#{booking.id}</p>
        </div>

        {/* Service */}

        <div>
          <p className="text-gray-400 text-sm">Service</p>

          <p className="font-semibold">
            {booking.service?.service_name ?? "Service"}
          </p>
        </div>

        {/* Price */}

        <div>
          <p className="flex items-center gap-2 text-gray-400 text-sm">
            <BadgeDollarSign size={16} />
            Price
          </p>

          <p className="text-2xl font-bold text-blue-600">
            ₱{Number(booking.price ?? 0).toLocaleString()}
          </p>
        </div>

        {/* Payment Status */}

        <div>
          <p className="flex items-center gap-2 text-gray-400 text-sm">
            <CreditCard size={16} />
            Payment Status
          </p>

          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              booking.payment_status === "Paid"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {booking.payment_status ?? "Unpaid"}
          </span>
        </div>

        {/* Booking Date */}

        <div>
          <p className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar size={16} />
            Booking Date
          </p>

          <p className="font-semibold">{booking.booking_date}</p>
        </div>

        {/* Booking Time */}

        <div>
          <p className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock3 size={16} />
            Booking Time
          </p>

          <p className="font-semibold">{booking.booking_time}</p>
        </div>
      </div>
    </div>
  );
}
