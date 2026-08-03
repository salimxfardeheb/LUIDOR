import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Déclinaisons disponibles dans /public :
 * - LIUDOR-icone-seule.png          : pastille ronde (couronne dorée sur fond marine)
 * - LIUDOR-principal-fond-clair.png : bloc complet pour fond clair
 * - LIUDOR-principal-fond-sombre.png: bloc complet pour fond sombre
 * - LIUDOR-monochrome-noir.png      : bloc complet monochrome pour fond clair
 * - LIUDOR-monochrome-blanc.png     : bloc complet monochrome pour fond sombre
 */
const LOGO_MARK = "/LIUDOR-icone-seule.png";

const LOGO_BLOCK = {
  "color-light": "/LIUDOR-principal-fond-clair.png",
  "color-dark": "/LIUDOR-principal-fond-sombre.png",
  "mono-light": "/LIUDOR-monochrome-noir.png",
  "mono-dark": "/LIUDOR-monochrome-blanc.png",
} as const;

/** Ratio natif du bloc complet (903 x 1020). */
const BLOCK_RATIO = 1020 / 903;

interface LogoProps {
  /**
   * - `lockup` : pastille + typo horizontale (navbar, footer)
   * - `mark`   : pastille seule (favicon inline, avatar, mobile)
   * - `full`   : bloc complet fourni par la charte (hero, pages d'auth)
   */
  variant?: "lockup" | "mark" | "full";
  size?: "sm" | "md" | "lg";
  /** Logo posé sur un fond sombre : sélectionne la déclinaison adaptée. */
  onDark?: boolean;
  /** Utilise la déclinaison monochrome (variant `full` uniquement). */
  monochrome?: boolean;
  showTagline?: boolean;
  priority?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { mark: 28, word: "text-lg", tagline: "text-[10px]", block: 96 },
  md: { mark: 36, word: "text-2xl", tagline: "text-xs", block: 160 },
  lg: { mark: 48, word: "text-4xl", tagline: "text-sm", block: 240 },
} as const;

export function Logo({
  variant = "lockup",
  size = "md",
  onDark = false,
  monochrome = false,
  showTagline = true,
  priority = false,
  className,
}: LogoProps) {
  const s = sizeMap[size];

  if (variant === "full") {
    const src =
      LOGO_BLOCK[
        `${monochrome ? "mono" : "color"}-${onDark ? "dark" : "light"}` as keyof typeof LOGO_BLOCK
      ];

    return (
      <Image
        src={src}
        alt="LIUDOR — Lieux d'Or"
        width={s.block}
        height={Math.round(s.block * BLOCK_RATIO)}
        priority={priority}
        className={cn("h-auto rounded-lg", className)}
      />
    );
  }

  if (variant === "mark") {
    return <LogoMark size={s.mark} priority={priority} className={className} />;
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={s.mark} priority={priority} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-semibold tracking-[0.2em]",
            onDark ? "text-white" : "text-primary-900",
            s.word
          )}
        >
          LIUDOR
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 font-medium uppercase tracking-[0.3em]",
              onDark ? "text-secondary-400" : "text-secondary",
              s.tagline
            )}
          >
            Lieux d&apos;Or
          </span>
        )}
      </div>
    </div>
  );
}

function LogoMark({
  size = 36,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={LOGO_MARK}
      alt="LIUDOR"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-full", className)}
    />
  );
}

export { LogoMark };
