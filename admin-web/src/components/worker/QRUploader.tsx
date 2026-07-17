import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

interface QRUploaderProps {
  label: string;
  folder: string;
  value?: string;
  onUploaded: (url: string) => void;
}

export default function QRUploader({
  label,
  folder,
  value,
  onUploaded,
}: QRUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    try {
      setUploading(true);

      const ext = file.name.split(".").pop();

      const fileName =
        `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("payment-qr")
        .upload(fileName, file, {
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("payment-qr")
        .getPublicUrl(fileName);

      onUploaded(data.publicUrl);
    } catch (err) {
      console.error(err);
      alert("Unable to upload QR image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">

      <label className="block font-medium">
        {label}
      </label>

      {value && (
        <img
          src={value}
          alt="QR"
          className="w-52 h-52 object-contain border rounded-lg"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (!e.target.files?.length) return;

          upload(e.target.files[0]);
        }}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        {uploading
          ? "Uploading..."
          : value
          ? "Replace QR"
          : "Upload QR"}
      </button>

    </div>
  );
}