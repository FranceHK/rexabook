import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  requiredMark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, requiredMark, id, className, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
          {requiredMark ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        className={cn("field", error && "!border-danger focus:!shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_22%,transparent)]", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && !error ? <p className="mt-1 text-xs text-ink-3">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  requiredMark?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, requiredMark, id, className, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
          {requiredMark ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      <textarea
        id={inputId}
        ref={ref}
        className={cn("field min-h-[88px] resize-y", error && "!border-danger", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
});