export default function Documents() {

  return (

    <div>

      <h2 className="text-2xl font-bold mb-8">

        Upload Documents

      </h2>

      <div className="grid grid-cols-2 gap-6">

        <Upload label="Valid ID" />

        <Upload label="Resume" />

        <Upload label="TESDA Certificate" />

        <Upload label="Barangay Clearance" />

        <Upload label="Police Clearance" />

        <Upload label="NBI Clearance" />

      </div>

    </div>

  );

}

function Upload({ label }: { label: string }) {

  return (

    <div>

      <label className="block mb-2 font-medium">

        {label}

      </label>

      <input
        type="file"
        className="w-full border rounded-lg p-3"
      />

    </div>

  );

}