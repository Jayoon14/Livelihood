import { useRegisterStore } from "../../../store/registerStore";

export default function WorkExperience() {
  const { data, updateData, errors, clearError } = useRegisterStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">Work Experience</h2>

      <div className="mb-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.noWorkExperience}
            onChange={(e) =>
              updateData({
                noWorkExperience: e.target.checked,
              })
            }
            className="w-5 h-5"
          />

          <span className="font-medium">I don't have work experience</span>
        </label>
      </div>

      {!data.noWorkExperience && (
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Company"
            value={data.company}
            error={errors.company}
            onChange={(value) => {
              updateData({
                company: value,
              });

              clearError("company");
            }}
          />

          <Input
            label="Position"
            value={data.position}
            error={errors.position}
            onChange={(value) => {
              updateData({
                position: value,
              });

              clearError("position");
            }}
          />

          <Select
            label="Employment Status"
            value={data.employmentStatus}
            error={errors.employmentStatus}
            options={["Full Time", "Part Time", "Contract", "Self Employed"]}
            onChange={(value) => {
              updateData({
                employmentStatus: value,
              });

              clearError("employmentStatus");
            }}
          />

          <Input
            type="date"
            label="Start Date"
            value={data.startDate}
            error={errors.startDate}
            onChange={(value) => {
              updateData({
                startDate: value,
              });

              clearError("startDate");
            }}
          />

          <Input
            type="date"
            label="End Date"
            value={data.endDate}
            error={errors.endDate}
            onChange={(value) => {
              updateData({
                endDate: value,
              });

              clearError("endDate");
            }}
          />

          <div className="col-span-2">
            <label className="block mb-2 font-medium">Job Description</label>

            <textarea
              rows={5}
              value={data.description}
              onChange={(e) => {
                updateData({
                  description: e.target.value,
                });

                clearError("description");
              }}
              className={`
                w-full
                border
                rounded-xl
                p-3
                resize-none
                outline-none
                focus:ring-2
                focus:ring-blue-600

                ${errors.description ? "border-red-500" : "border-gray-300"}
              `}
            />

            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type InputProps = {
  label: string;

  value: string;

  error?: string;

  onChange: (value: string) => void;

  type?: string;
};

function Input({
  label,

  value,

  error,

  onChange,

  type = "text",
}: InputProps) {
  return (
    <div>
      <label className="block mb-2 font-medium">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full
          border
          rounded-xl
          p-3
          outline-none
          focus:ring-2
          focus:ring-blue-600

          ${error ? "border-red-500" : "border-gray-300"}
        `}
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

type SelectProps = {
  label: string;

  value: string;

  options: string[];

  error?: string;

  onChange: (value: string) => void;
};

function Select({
  label,

  value,

  options,

  error,

  onChange,
}: SelectProps) {
  return (
    <div>
      <label className="block mb-2 font-medium">{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full
          border
          rounded-xl
          p-3

          ${error ? "border-red-500" : "border-gray-300"}
        `}
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
