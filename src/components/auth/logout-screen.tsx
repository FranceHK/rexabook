"use client";

import { useEffect } from "react";
import { logoutAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";

export function LogoutScreen() {
  useEffect(() => {
    logoutAction();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <BrandLogo className="mx-auto mb-3 size-24" priority />
        <div className="spinner mx-auto size-10" aria-hidden />
        <p className="mt-4 text-sm text-ink-2">Inakutoka...</p>
      </div>
    </div>
  );
}
