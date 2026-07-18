import { AdminShell } from "@/components/admin/admin-shell";
import { OverviewDashboard } from "@/components/admin/overview-dashboard";

export default function AdminPage() {
  return (
    <AdminShell activeHref="/admin" eyebrow="Aulacys · Tổng quan" title="">
      <OverviewDashboard />
    </AdminShell>
  );
}
