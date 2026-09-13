import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("spinner", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}