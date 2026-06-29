import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AuthCard({ children }: Props) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
      {children}
    </div>
  );
}