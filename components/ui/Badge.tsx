import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // `whitespace-nowrap` : une pastille `rounded-full` dont le texte passe à la
  // ligne perd sa forme et son texte sort de l'arrondi. Un badge est un libellé
  // court — il tient sur une ligne, ou la colonne s'élargit.
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-gray-100 text-gray-700",
        /** Marine de la charte : qualifie, sans annoncer un état. */
        primary: "border-transparent bg-primary-900/10 text-primary-900",
        /**
         * Or de la charte. Texte marine et non or : sur un fond doré pâle, l'or
         * sur l'or ne se lit pas.
         */
        secondary: "border-transparent bg-secondary/20 text-primary-900",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        error: "border-transparent bg-error/10 text-error",
        info: "border-transparent bg-info/10 text-info",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };