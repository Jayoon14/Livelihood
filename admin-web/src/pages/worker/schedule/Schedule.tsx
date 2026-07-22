import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  Save,
} from "lucide-react";

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
    })),
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
    for (const day of schedule) {
      if (!day.is_available) continue;

      if (day.start_time >= day.end_time) {
        alert(`${day.day_of_week}: End time must be later than Start time.`);

        return;
      }
    }

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
      <div
        className="
        p-8
        bg-gradient-to-br
        from-slate-50
        via-blue-50
        to-indigo-100
        min-h-screen
      "
      >
        <div
          className="
          max-w-[1800px]
          mx-auto
        "
        >
          {/* HEADER */}

          <div
            className="
            mb-10
            flex
            items-center
            justify-between
          "
          >
            <div
              className="
              flex
              items-center
              gap-5
            "
            >
              <div
                className="
                bg-blue-100
                p-4
                rounded-3xl
              "
              >
                <CalendarDays size={42} className="text-blue-600" />
              </div>

              <div>
                <p
                  className="
                  text-sm
                  uppercase
                  tracking-wider
                  text-gray-500
                "
                >
                  Availability Management
                </p>

                <h1
                  className="
                  text-4xl
                  font-bold
                  text-gray-900
                  mt-1
                "
                >
                  My Schedule
                </h1>

                <p
                  className="
                  text-gray-500
                  mt-2
                  max-w-2xl
                "
                >
                  Manage your working hours, availability, and unavailable
                  dates. Customers can only book within your schedule.
                </p>
              </div>
            </div>

            {/* ACTIVE DAYS CARD */}

            <div
              className="
              bg-gradient-to-r
              from-blue-600
              to-indigo-600
              text-white
              rounded-3xl
              px-8
              py-6
              shadow-lg
            "
            >
              <p
                className="
                text-blue-100
                text-sm
              "
              >
                Active Days
              </p>

              <h2
                className="
                text-4xl
                font-bold
              "
              >
                {schedule.filter((x) => x.is_available).length}/7
              </h2>

              <p
                className="
                text-blue-100
                text-xs
              "
              >
                Weekly Availability
              </p>
            </div>
          </div>

          {/* WEEKLY AVAILABILITY */}

          <div
            className="
            bg-white
            rounded-3xl
            border
            border-gray-100
            shadow-xl
            p-8
            mb-10
          "
          >
            <div
              className="
              flex
              items-center
              justify-between
              mb-8
            "
            >
              <div>
                <h2
                  className="
                  text-2xl
                  font-bold
                  text-gray-900
                "
                >
                  Weekly Availability
                </h2>

                <p
                  className="
                  text-gray-500
                  mt-1
                "
                >
                  Set your working hours for every day.
                </p>
              </div>

              <div
                className="
                bg-blue-50
                p-3
                rounded-2xl
              "
              >
                <Clock3 className="text-blue-600" size={32} />
              </div>
            </div>

            <div
              className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-5
            "
            >
              {schedule.map((item, index) => (
                <div
                  key={item.day_of_week}
                  className="
                    bg-gray-50
                    rounded-2xl
                    border
                    border-gray-100
                    p-6
                    hover:bg-white
                    hover:shadow-lg
                    transition-all
                    duration-300
                  "
                >
                  {/* DAY HEADER */}

                  <div
                    className="
                    flex
                    items-center
                    justify-between
                    mb-6
                  "
                  >
                    <div
                      className="
                      flex
                      items-center
                      gap-3
                    "
                    >
                      <div
                        className="
                        bg-blue-100
                        p-3
                        rounded-xl
                      "
                      >
                        <CalendarDays size={22} className="text-blue-600" />
                      </div>

                      <h3
                        className="
                        font-bold
                        text-lg
                        text-gray-800
                      "
                      >
                        {item.day_of_week}
                      </h3>
                    </div>

                    {/* TOGGLE */}

                    <button
                      onClick={() => {
                        const copy = [...schedule];

                        copy[index].is_available = !copy[index].is_available;

                        setSchedule(copy);
                      }}
                      className={`
                        w-14
                        h-8
                        rounded-full
                        transition
                        relative
                        ${item.is_available ? "bg-blue-600" : "bg-gray-300"}
                      `}
                    >
                      <span
                        className={`
                          absolute
                          top-1
                          w-6
                          h-6
                          bg-white
                          rounded-full
                          transition
                          ${item.is_available ? "left-7" : "left-1"}
                        `}
                      />
                    </button>
                  </div>

                  {/* STATUS */}

                  <div className="mb-5">
                    {item.is_available ? (
                      <div
                        className="
                        flex
                        items-center
                        gap-2
                        text-green-600
                        font-medium
                      "
                      >
                        <CheckCircle2 size={18} />
                        Available
                      </div>
                    ) : (
                      <div
                        className="
                        flex
                        items-center
                        gap-2
                        text-red-500
                        font-medium
                      "
                      >
                        <XCircle size={18} />
                        Unavailable
                      </div>
                    )}
                  </div>

                  {/* TIME INPUTS */}

                  <div
                    className="
                    grid
                    grid-cols-2
                    gap-4
                  "
                  >
                    <div>
                      <label
                        className="
                        text-sm
                        text-gray-500
                        block
                        mb-2
                      "
                      >
                        Start Time
                      </label>

                      <div
                        className="
                        flex
                        items-center
                        gap-2
                        border
                        rounded-xl
                        px-3
                        bg-white
                      "
                      >
                        <Clock3 size={17} className="text-blue-600" />

                        <input
                          type="time"
                          disabled={!item.is_available}
                          value={item.start_time}
                          onChange={(e) => {
                            const copy = [...schedule];

                            copy[index].start_time = e.target.value;

                            setSchedule(copy);
                          }}
                          className={`
                            w-full
                            py-3
                            outline-none
                            bg-transparent
                            ${!item.is_available ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="
                        text-sm
                        text-gray-500
                        block
                        mb-2
                      "
                      >
                        End Time
                      </label>

                      <div
                        className="
                        flex
                        items-center
                        gap-2
                        border
                        rounded-xl
                        px-3
                        bg-white
                      "
                      >
                        <Clock3 size={17} className="text-blue-600" />

                        <input
                          type="time"
                          value={item.end_time}
                          onChange={(e) => {
                            const copy = [...schedule];

                            copy[index].end_time = e.target.value;

                            setSchedule(copy);
                          }}
                          className="
                            w-full
                            py-3
                            outline-none
                            bg-transparent
                          "
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SAVE BUTTON */}

            <button
              onClick={handleSave}
              className="
                mt-8
                flex
                items-center
                gap-3
                bg-gradient-to-r
                from-blue-600
                to-indigo-600
                hover:scale-105
                transition
                text-white
                font-semibold
                px-10
                py-4
                rounded-2xl
                shadow-lg
              "
            >
              <Save size={20} />
              Save Changes
            </button>
          </div>
          {/* UNAVAILABLE DATES */}

          <div
            className="
            bg-white
            rounded-3xl
            border
            border-gray-100
            shadow-xl
            overflow-hidden
          "
          >
            {/* HEADER */}

            <div
              className="
              px-8
              py-7
              bg-gradient-to-r
              from-red-500
              to-pink-500
              text-white
            "
            >
              <div className="flex items-center gap-4">
                <div
                  className="
                  bg-white/20
                  p-3
                  rounded-2xl
                "
                >
                  <CalendarDays size={28} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold">Unavailable Dates</h2>

                  <p className="text-red-100 mt-1">
                    Block dates when you're unavailable.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* ADD FORM */}

              <div
                className="
                grid
                md:grid-cols-3
                gap-4
                mb-8
              "
              >
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="
                    border
                    border-gray-200
                    rounded-2xl
                    px-4
                    py-3
                    focus:ring-2
                    focus:ring-red-400
                    outline-none
                  "
                />

                <input
                  placeholder="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="
                    border
                    border-gray-200
                    rounded-2xl
                    px-4
                    py-3
                    focus:ring-2
                    focus:ring-red-400
                    outline-none
                  "
                />

                <button
                  onClick={handleAddDate}
                  className="
                    bg-gradient-to-r
                    from-green-500
                    to-emerald-600
                    text-white
                    rounded-2xl
                    font-semibold
                    hover:scale-105
                    transition
                  "
                >
                  + Add Date
                </button>
              </div>

              {/* EMPTY STATE */}

              {dates.length === 0 ? (
                <div
                  className="
                  py-16
                  text-center
                "
                >
                  <div
                    className="
                    w-24
                    h-24
                    rounded-full
                    bg-red-50
                    flex
                    items-center
                    justify-center
                    mx-auto
                  "
                  >
                    <CalendarDays size={46} className="text-red-500" />
                  </div>

                  <h3
                    className="
                    text-2xl
                    font-bold
                    mt-6
                  "
                  >
                    No Unavailable Dates
                  </h3>

                  <p
                    className="
                    text-gray-500
                    mt-3
                    max-w-md
                    mx-auto
                  "
                  >
                    You're available every day. Add dates here whenever you plan
                    to take a break or go on vacation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dates.map((date) => (
                    <div
                      key={date.id}
                      className="
                        bg-gray-50
                        rounded-2xl
                        border
                        border-gray-100
                        p-6
                        hover:bg-white
                        hover:shadow-lg
                        transition-all
                        duration-300
                      "
                    >
                      <div
                        className="
                        flex
                        justify-between
                        items-center
                      "
                      >
                        <div>
                          <div
                            className="
                            flex
                            items-center
                            gap-3
                          "
                          >
                            <CalendarDays className="text-red-500" size={20} />

                            <h3
                              className="
                              font-bold
                              text-lg
                            "
                            >
                              {date.unavailable_date}
                            </h3>
                          </div>

                          <p
                            className="
                            text-gray-500
                            mt-2
                            ml-8
                          "
                          >
                            {date.reason || "No reason provided"}
                          </p>
                        </div>

                        <button
                          onClick={() => removeDate(date.id)}
                          className="
                            bg-red-500
                            hover:bg-red-600
                            text-white
                            px-5
                            py-3
                            rounded-xl
                            transition
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
