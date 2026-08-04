import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-3 rounded-md border p-4 text-sm text-gray-700",
  {
    variants: {
      variant: {
        success: "border-success/30 bg-success/5",
        error: "border-error/30 bg-error/5",
        warning: "border-warning/30 bg-warning/5",
        info: "border-info/30 bg-info/5",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

const ICONS: Record<NonNullable<AlertProps["variant"]>, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLORS: Record<NonNullable<AlertProps["variant"]>, string> = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

/**
 * Message d'état en ligne (succès, erreur, avertissement, information).
 *
 * Contrairement au `Toast`, l'alerte reste dans le flux de la page : elle sert
 * aux retours de formulaire et aux bandeaux de confirmation, qui doivent
 * survivre à un rechargement et rester lisibles par un lecteur d'écran.
 */
function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = ICONS[variant ?? "info"];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_COLORS[variant ?? "info"])}
      />
      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-semibold text-gray-900">{title}</p>
        )}
        {children && <div className={cn(title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}

export { Alert, alertVariants };
