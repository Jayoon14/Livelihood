interface CompassIndicatorProps {
  bearing: number;
}

export default function CompassIndicator({
  bearing,
}: CompassIndicatorProps) {
  return (
    <div className="absolute bottom-28 left-3 z-20 lg:left-[332px]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl">
        <div
          style={{
            transform: `rotate(${-bearing}deg)`,
            transition: "transform .2s linear",
          }}
        >
          🧭
        </div>
      </div>
    </div>
  );
}