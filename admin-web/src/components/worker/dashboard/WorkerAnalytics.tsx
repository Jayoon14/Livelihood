import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const bookingData = [
  { day: "Mon", bookings: 2 },
  { day: "Tue", bookings: 4 },
  { day: "Wed", bookings: 3 },
  { day: "Thu", bookings: 6 },
  { day: "Fri", bookings: 5 },
  { day: "Sat", bookings: 7 },
  { day: "Sun", bookings: 4 },
];

const statusData = [
  {
    name: "Completed",
    value: 18,
  },
  {
    name: "Pending",
    value: 6,
  },
  {
    name: "Cancelled",
    value: 2,
  },
];

const COLORS = ["#3B82F6", "#FACC15", "#EF4444"];

export default function WorkerAnalytics() {
  return (
    <div className="mt-10 grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Weekly Bookings */}
      <div
        className="
          bg-white
          rounded-3xl
          border
          border-gray-100
          shadow-sm
          hover:shadow-xl
          transition-all
          duration-300
          p-8
        "
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Weekly Bookings
            </h2>
            <p className="text-gray-500 mt-1">Last 7 days performance</p>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl text-2xl">📈</div>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={bookingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#2563EB"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Booking Status */}
      <div
        className="
          bg-white
          rounded-3xl
          border
          border-gray-100
          shadow-sm
          hover:shadow-xl
          transition-all
          duration-300
          p-8
        "
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Booking Status</h2>
            <p className="text-gray-500 mt-1">Overall booking distribution</p>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl text-2xl">🥧</div>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={4}
              label
            >
              {statusData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center gap-8 mt-4 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            Completed
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
            Pending
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            Cancelled
          </div>
        </div>
      </div>
    </div>
  );
}
