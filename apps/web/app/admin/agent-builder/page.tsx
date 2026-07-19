"use client";

import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui";

/** React Flow needs the browser DOM — disable SSR for the canvas. */
const AgentGraphBuilder = dynamic(
  () =>
    import("@/components/admin/agent-graph-builder").then((m) => m.AgentGraphBuilder),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Đang tải React Flow canvas…
        </CardContent>
      </Card>
    ),
  },
);

export default function AgentBuilderPage() {
  return (
    <AdminShell
      title="Agent builder"
      eyebrow="Cấu hình graph theo sản phẩm"
      activeHref="/admin/agent-builder"
    >
      <AgentGraphBuilder />
    </AdminShell>
  );
}
