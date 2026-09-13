import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "secondary"
  | "ghost"
  | "outline"
  | "soft";

type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  success: "btn-success",
  danger: "btn-danger",
  warning: "btn-warning",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  soft: "btn-soft",
};

const sizes: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn("btn", variants[variant], sizes[size], loading && "!pointer-events-auto", className)}
      disabled={disabled || loading}
      aria-disabled={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon ? <span className="[&>svg]:size-[1.15em] inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
});