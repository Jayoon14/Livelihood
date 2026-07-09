import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getWorkerSchedule,
  saveWorkerSchedule,
  getUnavailableDates,
  addUnavailableDate,
  deleteUnavailableDate,
} from "../../../services/scheduleService";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function Schedule() {
  const [workerId, setWorkerId] = useState("");

  const [schedule, setSchedule] = useState(
    DAYS.map((day) => ({
      day_of_week: day,
      start_time: "08:00",
      end_time: "17:00",
      is_available: true,
    }))
  );

  const [dates, setDates] = useState<any[]>([]);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setWorkerId(user.id);

    const dbSchedule = await getWorkerSchedule(user.id);

    if (dbSchedule.length > 0) {
      setSchedule(dbSchedule);
    }

    const unavailable = await getUnavailableDates(user.id);

    setDates(unavailable);
  }

  async function handleSave() {
    await saveWorkerSchedule(workerId, schedule);

    alert("Schedule saved successfully.");
  }

  async function handleAddDate() {
    if (!newDate) {
      alert("Choose a date.");
      return;
    }

    await addUnavailableDate(workerId, newDate, reason);

    setNewDate("");
    setReason("");

    loadData();
  }

  async function removeDate(id: number) {
    await deleteUnavailableDate(id);

    loadData();
  }

  return (
    <WorkerLayout>

      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          My Schedule
        </h1>

        <div className="bg-white rounded-xl shadow p-6">

          <h2 className="text-xl font-bold mb-5">
            Weekly Schedule
          </h2>

          <table className="w-full">

            <thead>

              <tr className="border-b">

                <th className="text-left p-3">
                  Day
                </th>

                <th className="text-left p-3">
                  Available
                </th>

                <th className="text-left p-3">
                  Start
                </th>

                <th className="text-left p-3">
                  End
                </th>

              </tr>

            </thead>

            <tbody>

              {schedule.map((item, index) => (

                <tr
                  key={item.day_of_week}
                  className="border-b"
                >

                  <td className="p-3">
                    {item.day_of_week}
                  </td>

                  <td className="p-3">

                    <input
                      type="checkbox"
                      checked={item.is_available}
                      onChange={(e) => {
                        const copy = [...schedule];

                        copy[index].is_available =
                          e.target.checked;

                        setSchedule(copy);
                      }}
                    />

                  </td>

                  <td className="p-3">

                    <input
                      type="time"
                      value={item.start_time}
                      onChange={(e) => {
                        const copy = [...schedule];

                        copy[index].start_time =
                          e.target.value;

                        setSchedule(copy);
                      }}
                    />

                  </td>

                  <td className="p-3">

                    <input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => {
                        const copy = [...schedule];

                        copy[index].end_time =
                          e.target.value;

                        setSchedule(copy);
                      }}
                    />

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          <button
            onClick={handleSave}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Save Schedule
          </button>

        </div>

        <div className="bg-white rounded-xl shadow p-6 mt-8">

          <h2 className="text-xl font-bold mb-5">
            Unavailable Dates
          </h2>

          <div className="flex gap-3 mb-5">

            <input
              type="date"
              value={newDate}
              onChange={(e) =>
                setNewDate(e.target.value)
              }
              className="border rounded p-3"
            />

            <input
              placeholder="Reason"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              className="border rounded p-3 flex-1"
            />

            <button
              onClick={handleAddDate}
              className="bg-green-600 text-white px-5 rounded"
            >
              Add
            </button>

          </div>

          <table className="w-full">

            <thead>

              <tr className="border-b">

                <th className="text-left p-3">
                  Date
                </th>

                <th className="text-left p-3">
                  Reason
                </th>

                <th className="text-left p-3">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {dates.map((date) => (

                <tr
                  key={date.id}
                  className="border-b"
                >

                  <td className="p-3">
                    {date.unavailable_date}
                  </td>

                  <td className="p-3">
                    {date.reason}
                  </td>

                  <td className="p-3">

                    <button
                      onClick={() =>
                        removeDate(date.id)
                      }
                      className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </WorkerLayout>
  );
}