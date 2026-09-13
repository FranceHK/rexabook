"use client";

import { useEffect } from "react";
import { logoutAction } from "@/actions/auth";

export function LogoutScreen() {
  useEffect(() => {
    logoutAction();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto size-10" aria-hidden />
        <p className="mt-4 text-sm text-ink-2">Inakutoka...</p>
      </div>
    </div>
  );
}