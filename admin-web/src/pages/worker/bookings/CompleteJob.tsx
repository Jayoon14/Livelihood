import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export default function CompleteJob() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function removeImage(index: number) {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);

    const updatedPreview = [...previewImages];
    updatedPreview.splice(index, 1);
    setPreviewImages(updatedPreview);
  }

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files).slice(0, 3);

    setImages(files);

    setPreviewImages(files.map((file) => URL.createObjectURL(file)));
  }

  async function submitProof() {
    if (!summary.trim()) {
      alert("Please enter work summary.");
      return;
    }

    if (!hoursWorked) {
      alert("Please enter hours worked.");
      return;
    }

    if (images.length === 0) {
      alert("Please upload at least one proof image.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: proof, error } = await supabase
        .from("booking_completion_proofs")
        .insert({
          booking_id: bookingId,
          worker_id: user.id,
          summary,
          notes,
          hours_worked: hoursWorked,
        })
        .select()
        .single();

      if (error) throw error;

      for (const image of images) {
        const filename = `${Date.now()}-${image.name}`;

        const { error: uploadError } = await supabase.storage
          .from("completion-proofs")
          .upload(filename, image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("completion-proofs").getPublicUrl(filename);

        await supabase.from("booking_completion_images").insert({
          proof_id: proof.id,
          image_url: publicUrl,
        });
      }

      await supabase
        .from("bookings")
        .update({
          status: "Waiting Customer Confirmation",
        })
        .eq("id", bookingId);

      alert("Proof submitted successfully.");

      navigate("/worker/bookings");
    } catch (err) {
      console.error(err);

      alert("Unable to submit proof.");
    }

    setLoading(false);
  }
  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="bg-white rounded-2xl shadow border p-5">
        <h1 className="text-3xl font-bold text-slate-800">Complete Job</h1>

        <p className="text-gray-500 mt-1">
          Upload your proof before completing this booking.
        </p>

        <hr className="my-3" />

        <div className="space-y-3">
          {/* IMAGE UPLOAD */}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-lg">Upload Images</label>

              <span className="text-gray-500 text-sm">
                {images.length}/3 Uploaded
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="border rounded-xl h-32 bg-gray-100 flex items-center justify-center overflow-hidden"
                >
                  {previewImages[index] ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewImages[index]}
                        className="w-full h-full object-cover"
                        alt="Preview"
                      />

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No Image</span>
                  )}
                </div>
              ))}
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImages}
              className="w-full border rounded-xl p-2 bg-gray-50"
            />

            <p className="text-xs text-gray-400 mt-1">Maximum of 3 images.</p>
          </div>

          {/* SUMMARY */}

          <div>
            <label className="font-semibold block mb-1">Work Summary</label>

            <textarea
              rows={3}
              className="w-full border rounded-xl p-2.5"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the work completed..."
            />
          </div>

          {/* NOTES */}

          <div>
            <label className="font-semibold block mb-1">Additional Notes</label>

            <textarea
              rows={2}
              className="w-full border rounded-xl p-2.5"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          {/* HOURS */}

          <div>
            <label className="font-semibold block mb-1">Hours Worked</label>

            <input
              type="number"
              min="1"
              placeholder="8"
              className="border rounded-xl px-3 py-2 w-36"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
            />
          </div>

          {/* SUBMIT */}

          <button
            onClick={submitProof}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold transition"
          >
            {loading ? "Submitting..." : "Submit Completion Proof"}
          </button>
        </div>
      </div>
    </div>
  );
}
