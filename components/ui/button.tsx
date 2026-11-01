import type { ButtonHTMLAttributes } from "react";

/** shadcn-style button, minimal: no extra dependency, transform-only motion is in the caller. */
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.05] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
