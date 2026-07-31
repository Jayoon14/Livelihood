import { useState } from "react";
import type { CompletionProofImage } from "../types";

type Props = { images: CompletionProofImage[] };
export default function ProofImageGallery({ images }: Props) {
  const [active, setActive] = useState<string | null>(null);
  if (images.length === 0) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No proof images were submitted.</p>;
  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {images.map((image, index) => <button type="button" key={image.id} onClick={() => setActive(image.image_url)} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <img src={image.image_url} alt={`Completion proof ${index + 1}`} loading="lazy" className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"/>
      </button>)}
    </div>
    {active && <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/85 p-4" onMouseDown={(e) => e.target === e.currentTarget && setActive(null)}>
      <button type="button" onClick={() => setActive(null)} className="absolute right-5 top-4 text-4xl text-white">×</button>
      <img src={active} alt="Completion proof preview" className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"/>
    </div>}
  </>;
}
