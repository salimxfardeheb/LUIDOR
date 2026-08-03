import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "cursor-pointer select-none",
  ],
  {
    variants: {
      variant: {
        /** Action principale de la charte : or plein, texte blanc. */
        primary:
          "bg-secondary text-white shadow-sm hover:bg-secondary-400 hover:shadow-md",
        /** Action secondaire pleine, sur fond clair (bleu marine). */
        secondary:
          "bg-primary-900 text-white shadow-sm hover:bg-primary-700 hover:shadow-md",
        outline:
          "border border-gray-300 bg-transparent text-gray-900 shadow-xs hover:bg-gray-100",
        /** Outline blanc, pour les fonds marine (navbar, hero). */
        "outline-light":
          "border border-white/70 bg-transparent text-white hover:bg-white/10",
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
        danger: "bg-error text-white shadow-sm hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };