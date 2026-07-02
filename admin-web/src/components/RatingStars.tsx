import { Star } from "lucide-react";

type Props = {
  rating: number;
  setRating: (rating: number) => void;
};

export default function RatingStars({
  rating,
  setRating,
}: Props) {
  return (
    <div className="flex gap-2">

      {[1,2,3,4,5].map((star)=>(

        <button
          key={star}
          type="button"
          onClick={()=>setRating(star)}
        >

          <Star
            className={`w-8 h-8 transition

            ${
              star<=rating
              ? "fill-yellow-400 text-yellow-400"
              :"text-gray-300"
            }

            `}
          />

        </button>

      ))}

    </div>
  );
}