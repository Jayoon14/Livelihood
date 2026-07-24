import type { Coordinates } from "../types";

interface MouseCoordinatesProps {
  coordinates: Coordinates;
}

export default function MouseCoordinates({
  coordinates,
}: MouseCoordinatesProps) {
  return (
    <div className="absolute bottom-4 right-3 z-20 rounded-xl bg-black/75 px-3 py-2 text-xs text-white backdrop-blur">
      <div>Lat : {coordinates[1].toFixed(6)}</div>
      <div>Lng : {coordinates[0].toFixed(6)}</div>
    </div>
  );
}