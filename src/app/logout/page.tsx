import type { Metadata } from "next";
import { LogoutScreen } from "@/components/auth/logout-screen";

export const metadata: Metadata = { title: "Toka" };

export default function LogoutPage() {
  return <LogoutScreen />;
}