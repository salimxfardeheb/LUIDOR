import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { mark: "h-7 w-7", word: "text-lg", tagline: "text-[10px]" },
  md: { mark: "h-9 w-9", word: "text-2xl", tagline: "text-xs" },
  lg: { mark: "h-12 w-12", word: "text-4xl", tagline: "text-sm" },
} as const;

export function Logo({
  size = "md",
  showTagline = true,
  className,
}: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className={s.mark} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-extrabold tracking-tight text-primary-900",
            s.word
          )}
        >
          LIUDOR
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-0.5 font-medium tracking-[0.35em] text-secondary uppercase",
              s.tagline
            )}
          >
            Lieux&apos;Or
          </span>
        )}
      </div>
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo LIUDOR"
      className={className}
    >
      <defs>
        <linearGradient id="liudorGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9A24A" />
          <stop offset="100%" stopColor="#E4C87A" />
        </linearGradient>
        <linearGradient id="liudorNavy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F1E46" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#liudorNavy)" />

      <g stroke="url(#liudorGold)" strokeWidth="2.6" strokeLinecap="round">
        <path d="M10 30 L14.5 14 L24 22 L33.5 14 L38 30" fill="none" />
      </g>

      <path d="M12 24 L20 24" stroke="#E4C87A" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 30.5 H36" stroke="url(#liudorGold)" strokeWidth="3" strokeLinecap="round" />

      <circle cx="24" cy="19.5" r="2.1" fill="#E4C87A" />

      <path
        d="M17 36 L21 40 L24 37 L27 40 L31 36"
        fill="url(#liudorGold)"
      />
    </svg>
  );
}

export { LogoMark };