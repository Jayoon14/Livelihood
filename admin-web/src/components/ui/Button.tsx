type Props = {
  text: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export default function Button({
  text,
  onClick,
  type = "button",
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
    >
      {text}
    </button>
  );
}