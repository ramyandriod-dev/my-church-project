import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "blue", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("badge", `badge-${variant}`, className)}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
