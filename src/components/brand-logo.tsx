import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandLogo({
  className,
  priority = false,
  markOnly = false,
}: {
  className?: string;
  priority?: boolean;
  markOnly?: boolean;
}) {
  if (markOnly) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden", className)}>
        <Image
          src="/rexabooklogo-clean.png"
          alt="RexaBook"
          width={1254}
          height={1254}
          priority={priority}
          className="absolute left-1/2 top-0 h-auto w-[140%] max-w-none -translate-x-1/2"
        />
      </span>
    );
  }

  return (
    <Image
      src="/rexabooklogo-clean.png"
      alt="RexaBook"
      width={1254}
      height={1254}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
