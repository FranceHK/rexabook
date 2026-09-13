import { cn } from "@/lib/cn";

type BadgeTone = "done" | "wait" | "info" | "danger";

const tones: Record<BadgeTone, string> = {
  done: "badge-done",
  wait: "badge-wait",
  info: "badge-info",
  danger: "badge-danger",
};

export function Badge({ tone = "info", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}