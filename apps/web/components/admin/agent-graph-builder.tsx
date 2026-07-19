"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download, PanelRightClose, PanelRightOpen, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { listLoanProducts, seedLoanProducts, type LoanProductDto } from "@/lib/api";
import { AgentMetricsPanel } from "@/components/admin/agent-metrics-panel";
import {
  AGENT_META,
  GRAPH_PRESETS,
  POLICY_OPTIONS,
  RUNTIME_FIXED_AGENTS,
  SPECIALIST_AGENTS,
  type AgentId,
  type GraphConfig,
  type RuntimeFixedId,
  clearDraft,
  cloneConfig,
  configFromCatalogProduct,
  describeGraphImpact,
  graphConfigToYaml,
  resolveInitialConfig,
  saveDraft,
  toolsForAgent,
  validateGraphConfig,
} from "@/lib/graph-config";

const CONFIG_RUNTIME_HINT: Record<RuntimeFixedId, string> = {
  planner:
    "Runtime cố định — đọc product YAML, dựng DAG, nhận veto từ Compliance rồi replan. Không chỉnh tool/gate tại đây.",
  critic:
    "Runtime cố định — mọi số phải có tool call, mọi claim phải có citation. Không có tools/config riêng trên YAML.",
};

const CONFIG_AGENT_NOTE: Partial<Record<AgentId, string>> = {
  compliance:
    "Veto là cạnh đồ thị (Compliance → Planner), không phải câu trong prompt. Bật phụ thuộc Operations để chờ LTV.",
  credit: "Ngưỡng khẩu vị / DTI / CIC nằm ở tab Chỉ số.",
  operations: "Định giá TSBĐ + chứng từ. Limits LTV sản phẩm ở tab Chỉ số.",
};

type NodeKind = "specialist" | "fixed";

type AgentNodeData = {
  agentId: AgentId | RuntimeFixedId;
  label: string;
  line: string;
  kind: NodeKind;
};

const POS: Record<string, { x: number; y: number }> = {
  planner: { x: 40, y: 40 },
  credit: { x: 40, y: 200 },
  operations: { x: 260, y: 200 },
  compliance: { x: 480, y: 200 },
  critic: { x: 480, y: 40 },
};

type AgentFlowNode = Node<AgentNodeData, "agent">;

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const fixed = data.kind === "fixed";
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 shadow-sm",
        fixed ? "border-dashed border-border bg-secondary/70" : "border-border bg-card",
        selected && "border-brand ring-2 ring-brand/25",
      )}
    >
      {/* Fixed: in from left (veto), out from bottom (plan fan-out). Specialists: L→R. */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!h-2 !w-2 !bg-brand"
      />
      <p className="text-[10px] text-muted-foreground">{data.line}</p>
      <p className="text-sm font-semibold text-navy">{data.label}</p>
      {fixed && <p className="text-[10px] text-muted-foreground">Cố định</p>}
      <Handle
        type="source"
        position={fixed ? Position.Bottom : Position.Right}
        id="out"
        className="!h-2 !w-2 !bg-brand"
      />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

const selectClass =
  "h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const chipToggleClass =
  "rounded-md px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

function fixedNodes(): AgentFlowNode[] {
  return RUNTIME_FIXED_AGENTS.map((id) => ({
    id,
    type: "agent" as const,
    position: POS[id],
    draggable: false,
    selectable: true,
    // Connectable so Planner→specialist / specialist→Critic can be drawn (visual-only).
    connectable: true,
    data: {
      agentId: id,
      label: AGENT_META[id].label,
      line: AGENT_META[id].line,
      kind: "fixed" as const,
    },
  }));
}

const VETO_LOOP_ID = "loop:veto-replan";
const RUNTIME_EDGE_STYLE = { strokeDasharray: "6 4" } as const;

function isSpecialistId(id: string): id is AgentId {
  return SPECIALIST_AGENTS.includes(id as AgentId);
}

/** YAML depends = specialist↔specialist only. Runtime visual edges involve Planner/Critic. */
function isAllowedConnection(source: string, target: string): boolean {
  if (source === target) return false;
  if (isSpecialistId(source) && isSpecialistId(target)) return true;
  if (source === "planner" && isSpecialistId(target)) return true;
  if (isSpecialistId(source) && target === "critic") return true;
  if (source === "compliance" && target === "planner") return true;
  return false;
}

function makeEdge(source: string, target: string): Edge {
  const markerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
  if (source === "compliance" && target === "planner") {
    return {
      id: VETO_LOOP_ID,
      source,
      target,
      animated: true,
      label: "veto → replan",
      style: { ...RUNTIME_EDGE_STYLE },
      markerEnd,
    };
  }
  if (source === "planner" && isSpecialistId(target)) {
    return {
      id: `runtime:plan:${source}->${target}`,
      source,
      target,
      label: "plan",
      style: { ...RUNTIME_EDGE_STYLE },
      markerEnd,
    };
  }
  if (isSpecialistId(source) && target === "critic") {
    return {
      id: `runtime:feed:${source}->${target}`,
      source,
      target,
      style: { ...RUNTIME_EDGE_STYLE },
      markerEnd,
    };
  }
  return {
    id: `${source}->${target}`,
    source,
    target,
    markerEnd,
  };
}

function configToFlow(config: GraphConfig): { nodes: AgentFlowNode[]; edges: Edge[] } {
  const specialists: AgentFlowNode[] = config.agents.map((agentId) => ({
    id: agentId,
    type: "agent",
    position: POS[agentId] ?? { x: 200, y: 200 },
    data: {
      agentId,
      label: AGENT_META[agentId].label,
      line: AGENT_META[agentId].line,
      kind: "specialist",
    },
  }));

  const edges: Edge[] = [];
  for (const [dependent, deps] of Object.entries(config.depends)) {
    for (const source of deps ?? []) {
      edges.push(makeEdge(source, dependent));
    }
  }

  // Runtime fan-out: Planner drives each specialist (visual only — not product YAML depends)
  for (const agentId of config.agents) {
    edges.push(makeEdge("planner", agentId));
  }

  // Wow-flow loop: Compliance veto → Planner replan (runtime edge, not product YAML)
  if (config.agents.includes("compliance")) {
    edges.push(makeEdge("compliance", "planner"));
  }

  return { nodes: [...fixedNodes(), ...specialists], edges };
}

function flowToDepends(edges: Edge[]): GraphConfig["depends"] {
  const depends: GraphConfig["depends"] = {};
  for (const edge of edges) {
    if (edge.id === VETO_LOOP_ID) continue;
    if (edge.id.startsWith("runtime:")) continue;
    if (RUNTIME_FIXED_AGENTS.includes(edge.source as RuntimeFixedId)) continue;
    if (RUNTIME_FIXED_AGENTS.includes(edge.target as RuntimeFixedId)) continue;
    const target = edge.target as AgentId;
    const source = edge.source as AgentId;
    if (!depends[target]) depends[target] = [];
    if (!depends[target]!.includes(source)) depends[target]!.push(source);
  }
  return depends;
}

export function AgentGraphBuilder() {
  const [products, setProducts] = useState<LoanProductDto[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [config, setConfig] = useState<GraphConfig>(() => cloneConfig(GRAPH_PRESETS[0]));
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState("metrics");
  const [selectedAgent, setSelectedAgent] = useState<string>("credit");
  /** Inspector drawer — closed by default so canvas owns the viewport. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  function openAgentPanel(agentId: string, tab: string = "metrics") {
    setSelectedAgent(agentId);
    setSideTab(tab);
    setPanelOpen(true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let rows = await listLoanProducts("INDIVIDUAL");
        if (rows.length === 0) {
          await seedLoanProducts();
          rows = await listLoanProducts("INDIVIDUAL");
        }
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) => a.product_name.localeCompare(b.product_name, "vi"));
        setProducts(sorted);
        setProductId(sorted[0]?.id ?? "");
        setLoadError(null);
      } catch {
        if (cancelled) return;
        setLoadError("Không tải được Sản phẩm vay — dùng preset offline.");
        setProducts([]);
        setProductId(GRAPH_PRESETS[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    const catalog = products.find((p) => p.id === productId);
    const initial = catalog
      ? resolveInitialConfig(catalog)
      : cloneConfig(GRAPH_PRESETS.find((p) => p.id === productId) ?? GRAPH_PRESETS[0]);
    setConfig(initial);
    const { nodes: n, edges: e } = configToFlow(initial);
    setNodes(n);
    setEdges(e);
    setHydrated(true);
    setSavedAt(null);
  }, [productId, products, setNodes, setEdges]);

  const errors = useMemo(() => validateGraphConfig(config), [config]);
  const yaml = useMemo(() => graphConfigToYaml(config), [config]);
  const impact = useMemo(() => describeGraphImpact(config), [config]);
  const agentsOnCanvas = useMemo(() => new Set(config.agents), [config.agents]);
  const waveSummary = useMemo(
    () =>
      impact.waves
        .map((w) => w.map((a) => AGENT_META[a as AgentId]?.label ?? a).join(" + "))
        .join(" → "),
    [impact.waves],
  );

  const onNodesChangeSafe = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(
        changes.filter((c) => {
          if (c.type === "remove" && RUNTIME_FIXED_AGENTS.includes(c.id as RuntimeFixedId)) {
            return false;
          }
          return true;
        }),
      );
    },
    [onNodesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (!isAllowedConnection(connection.source, connection.target)) return;

      const next = makeEdge(connection.source, connection.target);
      setEdges((eds) => {
        if (eds.some((e) => e.id === next.id || (e.source === next.source && e.target === next.target))) {
          return eds;
        }
        return addEdge(next, eds);
      });
    },
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;
      return isAllowedConnection(connection.source, connection.target);
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    setConfig((prev) => ({
      ...prev,
      agents: nodes
        .filter((n) => n.data.kind === "specialist")
        .map((n) => n.data.agentId as AgentId)
        .filter((id) => SPECIALIST_AGENTS.includes(id)),
      depends: flowToDepends(edges),
    }));
  }, [nodes, edges, hydrated]);

  function addAgent(agentId: AgentId) {
    if (agentsOnCanvas.has(agentId)) return;
    setNodes((ns) => [
      ...ns,
      {
        id: agentId,
        type: "agent",
        position: POS[agentId] ?? { x: 200, y: 200 },
        data: {
          agentId,
          label: AGENT_META[agentId].label,
          line: AGENT_META[agentId].line,
          kind: "specialist",
        },
      },
    ]);
    // Visual runtime edges — not written to YAML depends
    setEdges((es) => {
      const next = [...es];
      const plan = makeEdge("planner", agentId);
      if (!next.some((e) => e.id === plan.id)) next.push(plan);
      if (agentId === "compliance") {
        const veto = makeEdge("compliance", "planner");
        if (!next.some((e) => e.id === veto.id)) next.push(veto);
      }
      return next;
    });
  }

  function removeSelected() {
    const selectedNodeIds = new Set(
      nodes.filter((n) => n.selected && n.data.kind === "specialist").map((n) => n.id),
    );
    const selectedEdgeIds = new Set(edges.filter((e) => e.selected).map((e) => e.id));
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;
    setNodes((ns) => ns.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((es) =>
      es.filter(
        (e) =>
          !selectedEdgeIds.has(e.id) &&
          !selectedNodeIds.has(e.source) &&
          !selectedNodeIds.has(e.target),
      ),
    );
  }

  function toggleTool(tool: string) {
    setConfig((prev) => {
      const has = prev.tools.includes(tool);
      return {
        ...prev,
        tools: has ? prev.tools.filter((t) => t !== tool) : [...prev.tools, tool],
      };
    });
  }

  function toggleDepend(agentId: AgentId, dep: AgentId) {
    setConfig((prev) => {
      const current = prev.depends[agentId] ?? [];
      const next = current.includes(dep)
        ? current.filter((d) => d !== dep)
        : [...current, dep];
      const updated = {
        ...prev,
        depends: { ...prev.depends, [agentId]: next },
      };
      const flow = configToFlow(updated);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      return updated;
    });
  }

  function persistConfig(next: GraphConfig) {
    setConfig(next);
    saveDraft(next);
    setSavedAt(new Date().toLocaleTimeString("vi-VN"));
  }

  function toggleOperations() {
    const has = config.agents.includes("operations");
    const nextAgents = has
      ? config.agents.filter((a) => a !== "operations")
      : ([...config.agents, "operations"] as AgentId[]);
    const nextDepends = { ...config.depends };
    if (has) {
      delete nextDepends.operations;
      for (const k of Object.keys(nextDepends) as AgentId[]) {
        nextDepends[k] = (nextDepends[k] ?? []).filter((d) => d !== "operations");
      }
    }
    const next = { ...config, agents: nextAgents, depends: nextDepends };
    persistConfig(next);
    const flow = configToFlow(next);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }

  function toggleComplianceWaitsOps() {
    const deps = config.depends.compliance ?? [];
    const on = deps.includes("operations");
    const nextDeps = on
      ? deps.filter((d) => d !== "operations")
      : [...deps, "operations" as AgentId];
    const next = {
      ...config,
      depends: { ...config.depends, compliance: nextDeps },
    };
    persistConfig(next);
    const flow = configToFlow(next);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }

  function toggleStpGate() {
    const next = {
      ...config,
      gate: {
        ...config.gate,
        stp_when: config.gate.stp_when === "never" ? "all_rules_pass" : "never",
      },
    };
    persistConfig(next);
  }

  function handleSave() {
    if (errors.length > 0) return;
    saveDraft(config);
    setSavedAt(new Date().toLocaleTimeString("vi-VN"));
  }

  function handleReset() {
    clearDraft(productId);
    const catalog = products.find((p) => p.id === productId);
    const next = catalog
      ? configFromCatalogProduct(catalog)
      : cloneConfig(GRAPH_PRESETS.find((p) => p.id === productId) ?? GRAPH_PRESETS[0]);
    setConfig(next);
    const { nodes: n, edges: e } = configToFlow(next);
    setNodes(n);
    setEdges(e);
    setSavedAt(null);
  }

  function handleExport() {
    const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.agentProductId || config.id}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Đang tải sản phẩm vay…
        </CardContent>
      </Card>
    );
  }

  const productOptions =
    products.length > 0
      ? products
      : GRAPH_PRESETS.map((p) => ({
          id: p.id,
          product_name: p.label,
          product_code: p.agentProductId,
          status: "ACTIVE" as const,
        }));

  return (
    <div className="flex min-h-0 flex-col gap-2">
      {/* Single compact toolbar — product + status chips + quick toggles + actions */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5">
        <select
          id="product-preset"
          aria-label="Sản phẩm vay"
          className={cn(selectClass, "max-w-[min(100%,220px)] shrink-0")}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.product_name}
              {"product_code" in p && p.product_code ? ` (${p.product_code})` : ""}
            </option>
          ))}
        </select>

        <Badge variant="outline" className="font-mono text-[10px]" title="File YAML runtime">
          {config.agentProductId}.yaml
        </Badge>
        <Badge
          variant={impact.gateMode === "stp" ? "success" : "warning"}
          className="text-[10px]"
          title={impact.gateHint}
        >
          {impact.gateMode === "stp" ? "STP" : "HITL"}
        </Badge>
        <Badge
          variant={impact.vetoCapable ? "brand" : "outline"}
          className="text-[10px]"
          title={impact.wowHint}
        >
          {impact.vetoCapable ? (impact.hasOpsGate ? "Veto+LTV" : "Veto") : "No veto"}
        </Badge>
        <Badge
          variant="outline"
          className="hidden max-w-[160px] truncate text-[10px] sm:inline-flex"
          title={waveSummary || impact.parallelHint}
        >
          {waveSummary || "—"}
        </Badge>

        <span className="mx-0.5 hidden h-4 w-px bg-border sm:block" aria-hidden />

        <select
          aria-label="Policy sản phẩm"
          className={cn(selectClass, "max-w-[140px]")}
          value={config.policy}
          onChange={(e) => {
            const next = { ...config, policy: e.target.value };
            persistConfig(next);
          }}
          title="Policy sản phẩm (không theo agent)"
        >
          {POLICY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.replace(".yaml", "")}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={cn(
            chipToggleClass,
            config.agents.includes("operations")
              ? "bg-brand text-on-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
          onClick={toggleOperations}
          title="Bật/tắt Operations trên canvas"
        >
          Ops
        </button>
        <button
          type="button"
          className={cn(
            chipToggleClass,
            (config.depends.compliance ?? []).includes("operations")
              ? "bg-brand text-on-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
          disabled={!config.agents.includes("compliance") || !config.agents.includes("operations")}
          onClick={toggleComplianceWaitsOps}
          title="Compliance chờ Operations (LTV) trước khi veto"
        >
          LTV gate
        </button>
        <button
          type="button"
          className={cn(
            chipToggleClass,
            config.gate.stp_when === "never"
              ? "bg-secondary text-muted-foreground hover:text-foreground"
              : "bg-brand text-on-primary",
          )}
          onClick={toggleStpGate}
          title={
            config.gate.stp_when === "never"
              ? "Bật STP khi mọi rule pass"
              : "Tắt STP — luôn HITL"
          }
        >
          {config.gate.stp_when === "never" ? "→STP" : "STP on"}
        </button>

        {savedAt && (
          <span className="hidden text-[10px] text-muted-foreground lg:inline">Đã lưu {savedAt}</span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} aria-label="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={removeSelected} aria-label="Xóa chọn">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            YAML
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={errors.length > 0}>
            <Save className="h-3.5 w-3.5" />
            Lưu
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="warning">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert variant="warning">
          <AlertDescription>{errors.join(" · ")}</AlertDescription>
        </Alert>
      )}

      <div className="relative min-h-[calc(100vh-11rem)] overflow-hidden rounded-xl border border-border bg-card">
        {/* Canvas — full width; inspector overlays so it never permanently crushes the graph */}
        <div className="relative h-[min(78vh,720px)] bg-secondary/30 lg:h-[calc(100vh-11rem)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeSafe}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, node) => openAgentPanel(String(node.id), "metrics")}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
            Cạnh đứt = veto→replan · Click agent mở panel
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-3 top-3 z-10 gap-1.5 shadow-sm"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-controls="agent-inspector-drawer"
            title={panelOpen ? "Ẩn panel" : "Mở panel"}
          >
            {panelOpen ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{panelOpen ? "Ẩn panel" : "Panel"}</span>
          </Button>
        </div>

        {/* Scrim — mobile/tablet only; desktop drawer sits over canvas edge */}
        {panelOpen && (
          <button
            type="button"
            aria-label="Đóng panel"
            className="absolute inset-0 z-20 bg-navy/20 lg:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}

        <aside
          id="agent-inspector-drawer"
          className={cn(
            "absolute inset-y-0 right-0 z-30 flex w-[min(100%,360px)] flex-col border-l border-border bg-card shadow-lg transition-transform duration-200 ease-out",
            panelOpen ? "translate-x-0" : "pointer-events-none translate-x-full",
          )}
          aria-hidden={!panelOpen}
        >
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
            <p className="truncate text-[11px] font-semibold leading-none text-navy">
              {AGENT_META[selectedAgent as AgentId | RuntimeFixedId]?.label ?? selectedAgent}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0"
              onClick={() => setPanelOpen(false)}
              aria-label="Ẩn panel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Tabs
            value={sideTab}
            onValueChange={setSideTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid h-7 w-full shrink-0 grid-cols-4 gap-0 rounded-none border-0 border-b border-border bg-transparent p-0">
              {(
                [
                  ["agents", "Agent"],
                  ["metrics", "Chỉ số"],
                  ["config", "Cấu hình"],
                  ["yaml", "YAML"],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    "h-7 rounded-none border-b-2 px-1 text-[11px] shadow-none",
                    sideTab === value
                      ? "border-brand bg-transparent text-navy"
                      : "border-transparent bg-transparent",
                  )}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="agents" className="mt-0 flex-1 overflow-y-auto p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cố định
              </p>
              <ul className="mb-2 space-y-1">
                {RUNTIME_FIXED_AGENTS.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => openAgentPanel(id, "metrics")}
                      className={cn(
                        "w-full rounded-md border border-dashed px-2.5 py-1.5 text-left text-sm",
                        selectedAgent === id
                          ? "border-brand bg-accent/40"
                          : "border-border bg-secondary/50",
                      )}
                    >
                      <span className="font-medium">{AGENT_META[id].label}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {AGENT_META[id].description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Chuyên gia
              </p>
              <div className="space-y-1">
                {SPECIALIST_AGENTS.map((agentId) => {
                  const meta = AGENT_META[agentId];
                  return (
                    <button
                      key={agentId}
                      type="button"
                      onClick={() => {
                        if (!agentsOnCanvas.has(agentId)) addAgent(agentId);
                        openAgentPanel(agentId, "metrics");
                      }}
                      className={cn(
                        "flex w-full flex-col rounded-md border px-2.5 py-1.5 text-left text-sm transition",
                        agentsOnCanvas.has(agentId)
                          ? selectedAgent === agentId
                            ? "border-brand bg-accent/40"
                            : "border-transparent bg-secondary/60"
                          : "border-border hover:border-brand/40 hover:bg-accent/30",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{meta.label}</span>
                        <span className="text-[10px]">
                          {agentsOnCanvas.has(agentId) ? "Chỉ số" : "Thêm"}
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{meta.description}</span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="mt-0 flex-1 overflow-y-auto p-2">
              <div className="mb-2 flex flex-wrap gap-0.5">
                {[...RUNTIME_FIXED_AGENTS, ...SPECIALIST_AGENTS].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedAgent(id)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      selectedAgent === id
                        ? "bg-brand text-on-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {AGENT_META[id].label}
                  </button>
                ))}
              </div>
              <AgentMetricsPanel
                agentId={selectedAgent}
                config={config}
                onChange={(next) => {
                  const agentsChanged =
                    next.agents.join() !== config.agents.join() ||
                    JSON.stringify(next.depends) !== JSON.stringify(config.depends);
                  setConfig(next);
                  if (agentsChanged) {
                    const flow = configToFlow(next);
                    setNodes(flow.nodes);
                    setEdges(flow.edges);
                  }
                  saveDraft(next);
                  setSavedAt(new Date().toLocaleTimeString("vi-VN"));
                }}
              />
            </TabsContent>

            <TabsContent value="config" className="mt-0 flex-1 space-y-2 overflow-y-auto p-2">
              <div className="flex flex-wrap gap-0.5">
                {[...RUNTIME_FIXED_AGENTS, ...SPECIALIST_AGENTS].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedAgent(id)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      selectedAgent === id
                        ? "bg-brand text-on-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {AGENT_META[id].label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Policy / STP trên thanh công cụ sản phẩm.
              </p>

              {selectedAgent === "planner" || selectedAgent === "critic" ? (
                <p className="rounded-md border border-dashed border-border bg-secondary/40 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
                  {CONFIG_RUNTIME_HINT[selectedAgent as RuntimeFixedId]}
                </p>
              ) : (
                <>
                  {CONFIG_AGENT_NOTE[selectedAgent as AgentId] && (
                    <p className="rounded-md bg-accent/30 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {CONFIG_AGENT_NOTE[selectedAgent as AgentId]}
                    </p>
                  )}

                  {!agentsOnCanvas.has(selectedAgent as AgentId) && (
                    <p className="text-xs text-muted-foreground">
                      Agent chưa trên canvas — thêm từ tab Agent hoặc bật Ops trên thanh công cụ.
                    </p>
                  )}

                  {(() => {
                    const agentId = selectedAgent as AgentId;
                    const others = SPECIALIST_AGENTS.filter(
                      (a) => a !== agentId && config.agents.includes(a),
                    );
                    if (others.length === 0) return null;
                    return (
                      <details open className="rounded-lg border border-border">
                        <summary className="cursor-pointer px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Phụ thuộc
                        </summary>
                        <div className="space-y-1 border-t border-border px-2.5 py-2">
                          {others.map((dep) => {
                            const on = (config.depends[agentId] ?? []).includes(dep);
                            return (
                              <label
                                key={dep}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggleDepend(agentId, dep)}
                                />
                                <span>
                                  {AGENT_META[agentId].label} chờ{" "}
                                  <strong>{AGENT_META[dep].label}</strong>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })()}

                  <details open className="rounded-lg border border-border">
                    <summary className="cursor-pointer px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Tools {AGENT_META[selectedAgent as AgentId]?.label} (
                      {toolsForAgent(selectedAgent).filter((t) => config.tools.includes(t)).length}/
                      {toolsForAgent(selectedAgent).length})
                    </summary>
                    <div className="max-h-56 space-y-0.5 overflow-y-auto border-t border-border p-2">
                      {toolsForAgent(selectedAgent).map((tool) => {
                        const on = config.tools.includes(tool);
                        return (
                          <label
                            key={tool}
                            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-secondary/50"
                          >
                            <input type="checkbox" checked={on} onChange={() => toggleTool(tool)} />
                            <span className="font-mono text-[11px]">{tool}</span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </>
              )}
            </TabsContent>

            <TabsContent value="yaml" className="mt-0 flex-1 overflow-hidden p-2">
              <pre className="h-full max-h-[calc(100vh-14rem)] overflow-auto rounded-lg bg-navy-deep p-3 text-[11px] leading-relaxed text-on-primary">
                {yaml}
              </pre>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
