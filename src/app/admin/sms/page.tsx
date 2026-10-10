import { redirect } from "next/navigation";

// Kept so old links and bookmarks still land on the single admin page.
export default function AdminSmsRedirect() {
  redirect("/admin?tab=sms");
}
