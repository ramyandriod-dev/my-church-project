"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right" | "start" | "end";
  className?: string;
}

export function Dropdown({ trigger, children, align = "end", className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Logical positioning for RTL and LTR support
  const alignClass =
    align === "end" || align === "right"
      ? "ltr:right-0 rtl:left-0"
      : "ltr:left-0 rtl:right-0";

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "dropdown animate-fade-in z-50",
            alignClass,
            className
          )}
          role="menu"
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                onClick: () => {
                  setOpen(false);
                  if (child.props.onClick) {
                    child.props.onClick();
                  }
                },
                role: "menuitem",
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  danger?: boolean;
}

export function DropdownItem({ icon, danger, className, children, ...props }: DropdownItemProps) {
  return (
    <button
      className={cn(
        "dropdown-item w-full text-start flex items-center gap-2.5",
        danger && "text-red-600 hover:bg-red-50",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-gray-100" />;
}
