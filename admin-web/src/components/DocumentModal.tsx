import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  file?: File | null;
  onClose: () => void;
};

export default function DocumentModal({
  open,
  title,
  file,
  onClose,
}: Props) {
  if (!open || !file) return null;

  const isImage = file.type.startsWith("image");

  const url = URL.createObjectURL(file);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex justify-center items-center p-8">

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">

        <div className="flex justify-between items-center px-6 py-4 border-b">

          <h2 className="text-2xl font-bold">
            {title}
          </h2>

          <button onClick={onClose}>
            <X size={30}/>
          </button>

        </div>

        <div className="p-6 flex justify-center">

          {isImage ? (

            <img
              src={url}
              alt={title}
              className="max-h-[70vh] rounded-xl"
            />

          ) : (

            <iframe
              src={url}
              className="w-full h-[70vh]"
            />

          )}

        </div>

      </div>

    </div>
  );
}