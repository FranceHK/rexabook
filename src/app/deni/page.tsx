import type { Metadata } from "next";
import { DebtLookup } from "@/components/public/debt-lookup";

export const metadata: Metadata = {
  title: "Angalia Deni",
  robots: { index: false, follow: false },
};

export default function PublicDebtLookupPage() {
  return <DebtLookup />;
}
