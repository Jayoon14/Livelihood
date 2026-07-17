import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./AvailabilityCalendar.css";

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

    <div className="space-y-4">

      <label className="font-semibold">
        Preferred Date
      </label>

      <Calendar

        minDate={new Date()}

        value={
          value
            ? new Date(value)
            : null
        }

        onChange={(selectedDate) => {

          const date =
            (selectedDate as Date)
              .toISOString()
              .split("T")[0];

          if (dates.includes(date)) {

            alert("Worker is unavailable on this date.");

            return;

          }

          onChange(date);

        }}

        tileClassName={({ date }) => {

          const day =
            date.toISOString().split("T")[0];

          if (dates.includes(day)) {

            return "booked-day";

          }

          return "available-day";

        }}

      />

      <div className="flex gap-6 text-sm">

        <div className="flex items-center gap-2">

          <div className="w-4 h-4 bg-green-500 rounded-full"></div>

          <span>Available</span>

        </div>

        <div className="flex items-center gap-2">

          <div className="w-4 h-4 bg-red-500 rounded-full"></div>

          <span>Unavailable</span>

        </div>

      </div>

    </div>

  );

}