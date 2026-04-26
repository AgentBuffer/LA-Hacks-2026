"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-sans font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-ink text-paper hover:bg-ink-2 border border-ink":
              variant === "default" || variant === "primary",
            "border border-ink-2 bg-transparent text-ink hover:bg-bg-2":
              variant === "outline",
            "text-ink-2 hover:bg-bg-2": variant === "ghost",
            "text-brand-ink underline-offset-2 hover:underline": variant === "link",
          },
          {
            "h-7 px-2.5 text-[11px] font-mono": size === "sm",
            "h-9 px-3.5 text-[12.5px]": size === "md",
            "h-11 px-5 text-[13px]": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
