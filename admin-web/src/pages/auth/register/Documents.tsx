import { useRegisterStore } from "../../../store/registerStore";

type UploadField =
  | "validId"
  | "resume"
  | "tesdaCertificate"
  | "barangayClearance"
  | "policeClearance"
  | "nbiClearance";

export default function Documents() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Upload Documents
      </h2>

      <p className="text-gray-500 mb-8">
        Please upload the required documents below.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <UploadCard
          title="Valid ID"
          field="validId"
        />

        <UploadCard
          title="Resume"
          field="resume"
        />

        <UploadCard
          title="TESDA Certificate"
          field="tesdaCertificate"
        />

        <UploadCard
          title="Barangay Clearance"
          field="barangayClearance"
        />

        <UploadCard
          title="Police Clearance"
          field="policeClearance"
        />

        <UploadCard
          title="NBI Clearance"
          field="nbiClearance"
        />
      </div>
    </div>
  );
}

type UploadCardProps = {
  title: string;
  field: UploadField;
};

function UploadCard({
  title,
  field,
}: UploadCardProps) {

  const {
    data,
    updateData,
    errors,
    clearError,
  } = useRegisterStore();

  const file = data[field];


  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      e.target.files?.[0] ?? null;

    updateData({
      [field]: selectedFile,
    });

    clearError(field);
  }


  function removeFile() {
    updateData({
      [field]: null,
    });
  }


  return (
    <div className="border rounded-2xl p-6 shadow-sm bg-white">

      <h3 className="font-semibold text-lg mb-4">
        {title}
      </h3>

      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className={`w-full border rounded-xl p-3 ${
          errors[field]
            ? "border-red-500"
            : "border-gray-300"
        }`}
      />

      {errors[field] && (
        <p className="text-red-500 text-sm mt-2">
          {errors[field]}
        </p>
      )}

      {file && (
        <div className="mt-4">

          {file.type.startsWith("image") && (
            <img
              src={URL.createObjectURL(file)}
              alt={title}
              className="rounded-xl h-40 w-full object-cover"
            />
          )}

          {file.type === "application/pdf" && (
            <div className="bg-gray-100 rounded-xl p-4">
              📄 {file.name}
            </div>
          )}

          <button
            type="button"
            onClick={removeFile}
            className="text-red-600 mt-3 hover:underline"
          >
            Remove File
          </button>

        </div>
      )}

    </div>
  );
}