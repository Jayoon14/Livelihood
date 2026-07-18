import QRUploader from "./QRUploader";

interface MayaSectionProps {
  values: {
    enable_maya: boolean;
    maya_name: string;
    maya_number: string;
    maya_qr: string;
  };

  onChange: (field: string, value: any) => void;
}

export default function MayaSection({
  values,
  onChange,
}: MayaSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow border p-6 mt-6">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold">
            Maya
          </h2>

          <p className="text-gray-500 text-sm">
            Enable Maya payment for customers.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">

          <input
            type="checkbox"
            checked={values.enable_maya}
            onChange={(e) =>
              onChange(
                "enable_maya",
                e.target.checked
              )
            }
          />

          Enable

        </label>

      </div>

      {values.enable_maya && (

        <div className="mt-6 space-y-5">

          <div>

            <label className="block mb-2 font-medium">
              Maya Account Name
            </label>

            <input
              type="text"
              value={values.maya_name}
              onChange={(e) =>
                onChange(
                  "maya_name",
                  e.target.value
                )
              }
              placeholder="Juan Dela Cruz"
              className="w-full border rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Maya Number
            </label>

            <input
              type="text"
              maxLength={11}
              value={values.maya_number}
              onChange={(e) =>
                onChange(
                  "maya_number",
                  e.target.value
                )
              }
              placeholder="09XXXXXXXXX"
              className="w-full border rounded-xl p-3"
            />

          </div>

          <QRUploader
            label="Maya QR"
            folder="maya"
            value={values.maya_qr}
            onUploaded={(url) =>
              onChange("maya_qr", url)
            }
          />

        </div>

      )}

    </div>
  );
}