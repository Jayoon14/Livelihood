import { useEffect, useState } from "react";

import { getUnavailableDates } from "../../services/availabilityService";

interface Props {
  workerId: string;
  value: string;
  onChange: (date: string) => void;
}

export default function AvailabilityCalendar({
  workerId,
  value,
  onChange,
}: Props) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    if (workerId) {
      loadUnavailableDates();
    }
  }, [workerId]);

  async function loadUnavailableDates() {
    try {
      const data = await getUnavailableDates(workerId);
      setDates(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-2">

      <label className="font-semibold">
        Preferred Date
      </label>

      <input
        type="date"
        value={value}
        min={new Date().toISOString().split("T")[0]}
        onChange={(e) => {
          if (dates.includes(e.target.value)) {
            alert("Worker is unavailable on this date.");
            return;
          }

          onChange(e.target.value);
        }}
        className="border rounded-lg p-3 w-full"
      />

      {dates.includes(value) && (
        <p className="text-red-600 text-sm">
          This worker is unavailable on this date.
        </p>
      )}

      <div className="flex gap-6 text-sm mt-3">

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Available</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span>Unavailable</span>
        </div>

      </div>

    </div>
  );
}