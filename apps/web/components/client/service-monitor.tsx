"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Route, Server, ShieldAlert } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { assessViaGateway, getServiceStatus, type AssessResponse, type ServiceStatusResponse } from "@/lib/api";
import { cn } from "@/lib/cn";

function formatTime(value: string | undefined) {
  if (!value) return "Chưa kiểm tra";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function ServiceMonitor() {
  const [status, setStatus] = useState<ServiceStatusResponse | null>(null);
  const [trace, setTrace] = useState<AssessResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    setLoadingStatus(true);
    setError(null);
    try {
      setStatus(await getServiceStatus());
    } catch {
      setStatus(null);
      setError("Gateway chưa sẵn sàng");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function runTrace() {
    setLoadingTrace(true);
    setError(null);
    try {
      const result = await assessViaGateway("retail mortgage");
      setTrace(result);
      await refreshStatus();
    } catch {
      setError("Không chạy được trace qua gateway");
    } finally {
      setLoadingTrace(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  const visibleServices = useMemo(() => status?.services.slice(0, 9) ?? [], [status]);
  const serviceSummary = status
    ? `${status.summary.up}/${status.summary.total} dịch vụ hoạt động`
    : "Đang chờ gateway";

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-12">
      <Card className="overflow-hidden border-0 bg-secondary p-0 shadow-none">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="flex items-center gap-2 text-sm font-bold uppercase text-navy">
              <Server size={18} className="text-brand" />
              Service monitor
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase",
                  status?.status === "ok"
                    ? "bg-success-soft text-success-foreground"
                    : "bg-warning-soft text-warning-foreground",
                )}
              >
                {status?.status ?? "degraded"}
              </span>
              <span className="text-sm text-muted-foreground">{serviceSummary}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Gateway kiểm tra health của orchestrator và các service nghiệp vụ trước khi chạy luồng demo.
            </p>
            {error && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <ShieldAlert size={16} />
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={refreshStatus} disabled={loadingStatus}>
                <RefreshCw size={16} className={cn(loadingStatus && "animate-spin")} />
                Kiểm tra lại
              </Button>
              <Button type="button" onClick={runTrace} disabled={loadingTrace}>
                <Route size={16} />
                Chạy trace demo
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Cập nhật: {formatTime(status?.checked_at)}</p>
          </div>

          <div className="p-6 lg:p-8">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((service) => (
                <div key={service.name} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{service.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{service.url}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        service.status === "up"
                          ? "bg-success-soft text-success-foreground"
                          : "bg-warning-soft text-warning-foreground",
                      )}
                    >
                      {service.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {service.latency_ms ?? 0}ms {service.critical ? "critical" : "supporting"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Activity size={16} className="text-brand" />
                Trace luồng mortgage
              </div>
              {trace ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Outcome</p>
                      <p className="mt-1 font-semibold text-navy">{trace.outcome}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Lane</p>
                      <p className="mt-1 font-semibold text-navy">{trace.run_trace.lane}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Replan</p>
                      <p className="mt-1 font-semibold text-navy">{trace.run_trace.replan_count}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trace.trace.map((item, index) => (
                      <span key={`${item.node}-${index}`} className="rounded-full bg-active-soft px-3 py-1 text-xs font-medium text-active-foreground">
                        {item.node}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Bấm chạy trace demo để thấy gateway gọi `/assess` và trả lại timeline node từ orchestrator.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
