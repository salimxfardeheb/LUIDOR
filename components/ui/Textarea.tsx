import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 5, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      "flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "text-gray-900 placeholder:text-gray-400 shadow-xs",
      "transition-colors focus-visible:outline-none focus-visible:border-accent",
      "focus-visible:ring-2 focus-visible:ring-accent/40",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
