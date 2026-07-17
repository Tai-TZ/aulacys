import { AdminShell } from "@/components/admin/admin-shell";
import { AssessDashboard } from "@/components/admin/assess-dashboard";

export default function AdminPage() {
  return (
    <AdminShell activeHref="/admin" eyebrow="Monitor · wow flow" title="Thẩm định bán lẻ live">
      <AssessDashboard />
    </AdminShell>
  );
}
