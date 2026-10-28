import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, initials, size = "md", status, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    const statusColors = {
      online: "bg-mint-500",
      offline: "bg-gray-400",
      busy: "bg-coral-500",
    };

    return (
      <div ref={ref} className={cn("relative inline-flex", className)} {...props}>
        <div
          className={cn(
            "rounded-full bg-navy-950 flex items-center justify-center overflow-hidden",
            sizeClasses[size]
          )}
        >
          {src ? (
            <img src={src} alt={alt || ""} className="h-full w-full object-cover" />
          ) : initials ? (
            <span className="font-medium text-white">{initials}</span>
          ) : (
            <svg
              className="h-full w-full text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white",
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
