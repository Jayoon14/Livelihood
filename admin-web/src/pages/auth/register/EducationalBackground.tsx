import { useRegisterStore } from "../../../store/registerStore";

export default function EducationalBackground() {
  const {
    data,
    updateData,
    errors,
    clearError,
  } = useRegisterStore();

  const education = data.highestEducation;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Educational Background
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <div>
          <label className="block mb-2 font-medium">
            Highest Educational Attainment
          </label>

          <select
            value={education}
            onChange={(e) => {
              updateData({
                highestEducation: e.target.value,
              });

              clearError("highestEducation");
            }}
            className={`w-full border rounded-xl p-3 ${
              errors.highestEducation
                ? "border-red-500"
                : "border-gray-300"
            }`}
          >
            <option value="">
              Select Highest Educational Attainment
            </option>

            <option value="Elementary">
              Elementary
            </option>

            <option value="Junior High">
              Junior High School
            </option>

            <option value="Senior High">
              Senior High School
            </option>

            <option value="College">
              College
            </option>

            <option value="Master">
              Master's Degree
            </option>

            <option value="Doctorate">
              Doctorate Degree
            </option>

            <option value="Other">
              Other
            </option>
          </select>

          {errors.highestEducation && (
            <p className="text-red-500 text-sm mt-1">
              {errors.highestEducation}
            </p>
          )}
        </div>


        {education === "Other" && (
          <Input
            label="Please Specify"
            value={data.otherEducation}
            error={errors.otherEducation}
            onChange={(value) => {
              updateData({
                otherEducation: value,
              });

              clearError("otherEducation");
            }}
          />
        )}


        {[
          "Elementary",
          "Junior High",
          "Senior High",
          "College",
          "Master",
          "Doctorate",
        ].includes(education) && (
          <Input
            label="Elementary School"
            value={data.elementary}
            error={errors.elementary}
            onChange={(value) => {
              updateData({
                elementary: value,
              });

              clearError("elementary");
            }}
          />
        )}


        {[
          "Junior High",
          "Senior High",
          "College",
          "Master",
          "Doctorate",
        ].includes(education) && (
          <Input
            label="Junior High School"
            value={data.secondary}
            error={errors.secondary}
            onChange={(value) => {
              updateData({
                secondary: value,
              });

              clearError("secondary");
            }}
          />
        )}


        {[
          "Senior High",
          "College",
          "Master",
          "Doctorate",
        ].includes(education) && (
          <Input
            label="Senior High School"
            value={data.seniorHigh}
            error={errors.seniorHigh}
            onChange={(value) => {
              updateData({
                seniorHigh: value,
              });

              clearError("seniorHigh");
            }}
          />
        )}


        {[
          "College",
          "Master",
          "Doctorate",
        ].includes(education) && (
          <>
            <Input
              label={
                education === "College"
                  ? "College / University"
                  : "University"
              }
              value={data.college}
              error={errors.college}
              onChange={(value) => {
                updateData({
                  college: value,
                });

                clearError("college");
              }}
            />

            <Input
              label={
                education === "Master"
                  ? "Master's Degree"
                  : education === "Doctorate"
                  ? "Doctorate Degree"
                  : "Course"
              }
              value={data.course}
              error={errors.course}
              onChange={(value) => {
                updateData({
                  course: value,
                });

                clearError("course");
              }}
            />

            <Input
              label="Year Graduated"
              type="number"
              value={data.yearGraduated}
              error={errors.yearGraduated}
              onChange={(value) => {
                updateData({
                  yearGraduated: value,
                });

                clearError("yearGraduated");
              }}
            />
          </>
        )}


        {[
          "Master",
          "Doctorate",
        ].includes(education) && (
          <Input
            label="PRC License No."
            value={data.prc}
            error={errors.prc}
            onChange={(value) => {
              updateData({
                prc: value,
              });

              clearError("prc");
            }}
          />
        )}


        <Input
          label="TESDA Certificate (Optional)"
          value={data.tesda}
          onChange={(value) =>
            updateData({
              tesda: value,
            })
          }
        />


        <div className="md:col-span-2">
          <label className="block mb-2 font-medium">
            Trainings / Seminars (Optional)
          </label>

          <textarea
            rows={4}
            value={data.trainings}
            onChange={(e) =>
              updateData({
                trainings: e.target.value,
              })
            }
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              p-3
              resize-none
            "
          />
        </div>

      </div>
    </div>
  );
}


type InputProps = {
  label: string;
  value: string;
  onChange: (value:string)=>void;
  type?: string;
  error?: string;
};


function Input({
  label,
  value,
  onChange,
  type="text",
  error,
}:InputProps){

  return (
    <div>

      <label className="block mb-2 font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className={`w-full border rounded-xl p-3 ${
          error
            ? "border-red-500"
            : "border-gray-300"
        }`}
      />

      {error && (
        <p className="text-red-500 text-sm mt-1">
          {error}
        </p>
      )}

    </div>
  );
}