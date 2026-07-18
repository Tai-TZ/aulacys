import { AdminShell } from "@/components/admin/admin-shell";
import { AssessDashboard } from "@/components/admin/assess-dashboard";

export default function BoHoSoPage() {
  return (
    <AdminShell activeHref="/admin/bo-ho-so" eyebrow="Aulacys · Bộ hồ sơ" title="">
      <AssessDashboard />
    </AdminShell>
  );
}
