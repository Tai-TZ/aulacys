/**
 * Product graph config — mirrors agents/products/*.yaml schema.
 * Specialist agents are product-configurable; Planner + Critic always run (runtime).
 */

export const SPECIALIST_AGENTS = ["credit", "operations", "compliance"] as const;
export type AgentId = (typeof SPECIALIST_AGENTS)[number];

/** @deprecated use SPECIALIST_AGENTS — kept for older imports */
export const AGENT_WHITELIST = SPECIALIST_AGENTS;

export const RUNTIME_FIXED_AGENTS = ["planner", "critic"] as const;
export type RuntimeFixedId = (typeof RUNTIME_FIXED_AGENTS)[number];

export const AGENT_META: Record<
  AgentId | RuntimeFixedId,
  { label: string; line: string; description: string; fixed?: boolean }
> = {
  planner: {
    label: "Planner",
    line: "Runtime",
    description: "Đọc config → dựng DAG, nhận veto → replan",
    fixed: true,
  },
  credit: {
    label: "Credit",
    line: "Tuyến 1",
    description: "Khả năng trả nợ, CIC, đề xuất",
  },
  operations: {
    label: "Operations",
    line: "Tuyến 1",
    description: "Hồ sơ, định giá TSBĐ",
  },
  compliance: {
    label: "Compliance",
    line: "Tuyến 2",
    description: "Policy + quyền veto",
  },
  critic: {
    label: "Critic",
    line: "Runtime",
    description: "Mọi số ← tool; mọi claim ← điều khoản",
    fixed: true,
  },
};

export const TOOL_WHITELIST = [
  "core_banking_read",
  "loan_calculator",
  "aml_screening",
  "workflow_write",
  "cic_lookup",
  "income_verify",
  "salary_verify",
  "sao_ke_parse",
  "compute_annual_debt_service",
  "compute_dti",
  "compute_ltv",
  "property_valuation",
  "land_registry",
  "doc_checklist",
  "aml_screen",
  "related_party",
  "price_loan",
  "kyc_check",
  "ubo_check",
  "ekyc_face_match",
  "geo_radius_check",
  "regional_income_check",
  "schedule_valuation",
  "write_approval_ticket",
  "age_at_maturity_check",
  "amount_within_income_multiple",
  "disposable_income_buffer",
  "dti_within_income_band",
  "term_matches_purpose",
] as const;

export type ToolId = (typeof TOOL_WHITELIST)[number];

/**
 * UI ownership — which tools appear in each specialist's Cấu hình tab.
 * Product YAML still stores a flat `tools` list; toggles write into that list.
 */
export const TOOLS_BY_AGENT: Record<AgentId, readonly ToolId[]> = {
  credit: [
    "core_banking_read",
    "loan_calculator",
    "cic_lookup",
    "income_verify",
    "salary_verify",
    "sao_ke_parse",
    "compute_annual_debt_service",
    "compute_dti",
    "price_loan",
    "age_at_maturity_check",
    "amount_within_income_multiple",
    "disposable_income_buffer",
    "dti_within_income_band",
    "term_matches_purpose",
  ],
  operations: [
    "workflow_write",
    "property_valuation",
    "land_registry",
    "doc_checklist",
    "compute_ltv",
    "schedule_valuation",
    "write_approval_ticket",
    "geo_radius_check",
  ],
  compliance: [
    "aml_screening",
    "aml_screen",
    "related_party",
    "kyc_check",
    "ubo_check",
    "ekyc_face_match",
    "regional_income_check",
  ],
};

export function toolsForAgent(agentId: string): readonly ToolId[] {
  if (agentId === "credit" || agentId === "operations" || agentId === "compliance") {
    return TOOLS_BY_AGENT[agentId];
  }
  return [];
}

export const POLICY_OPTIONS = ["retail_lending.yaml", "retail_mortgage.yaml"] as const;

export type GraphConfig = {
  /** Draft key — usually catalog product UUID */
  id: string;
  /** agents/products/<id>.yaml */
  agentProductId: string;
  label: string;
  productCode?: string;
  agents: AgentId[];
  depends: Partial<Record<AgentId, AgentId[]>>;
  tools: string[];
  policy: string;
  limits: Record<string, number>;
  /** Bank appetite thresholds (rule id → value). Legal rules never live here. */
  appetite: Record<string, number>;
  gate: {
    stp_when: string;
    else: "hitl" | "reject";
  };
};

/** Local-first metric catalog — works without policy API. */
export type MetricDef = {
  id: string;
  label: string;
  agent: AgentId;
  kind: "legal" | "appetite";
  metric: string;
  operator: string;
  defaultThreshold: number;
  unit: string;
  /** If true, threshold is editable (appetite numeric only). */
  editable: boolean;
};

export const METRIC_CATALOG: MetricDef[] = [
  {
    id: "prohibited_purpose_refinance_other_bank",
    label: "Cấm tất toán NH khác",
    agent: "compliance",
    kind: "legal",
    metric: "prohibited_purpose_refinance_other_bank",
    operator: "==",
    defaultThreshold: 0,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "land_title_clear",
    label: "Sổ đỏ / TSBĐ pháp lý ổn",
    agent: "operations",
    kind: "legal",
    metric: "land_registry_ok",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "kyc_identity_verified",
    label: "KYC đã xác minh",
    agent: "compliance",
    kind: "legal",
    metric: "kyc_verified",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "max_cic_group",
    label: "Trần nhóm nợ CIC",
    agent: "credit",
    kind: "appetite",
    metric: "cic_group",
    operator: "<=",
    defaultThreshold: 2,
    unit: "cic_group",
    editable: true,
  },
  {
    id: "max_retail_dti",
    label: "Trần DTI",
    agent: "credit",
    kind: "appetite",
    metric: "dti",
    operator: "<=",
    defaultThreshold: 0.5,
    unit: "ratio",
    editable: true,
  },
  {
    id: "no_bad_debt",
    label: "Không nợ xấu",
    agent: "credit",
    kind: "appetite",
    metric: "has_bad_debt",
    operator: "==",
    defaultThreshold: 0,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "income_verified",
    label: "Thu nhập đã xác minh",
    agent: "credit",
    kind: "appetite",
    metric: "income_verified",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "docs_complete",
    label: "Đủ chứng từ bắt buộc",
    agent: "operations",
    kind: "appetite",
    metric: "docs_complete",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "max_ltv_product_cap",
    label: "LTV trong trần sản phẩm",
    agent: "compliance",
    kind: "appetite",
    metric: "ltv_within_product_cap",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
  {
    id: "max_amount_product_ceiling",
    label: "Số tiền trong trần sản phẩm",
    agent: "compliance",
    kind: "appetite",
    metric: "amount_within_product_ceiling",
    operator: "==",
    defaultThreshold: 1,
    unit: "boolean_flag",
    editable: false,
  },
];

export const ALL_LIMIT_KEYS = [
  { key: "ltv_cap", label: "Trần LTV", defaultValue: 0.9 },
  { key: "amount_ceiling", label: "Trần số tiền (VND)", defaultValue: 500_000_000 },
  { key: "term_years_max", label: "Kỳ hạn max (năm)", defaultValue: 35 },
  { key: "term_months_max", label: "Kỳ hạn max (tháng)", defaultValue: 60 },
] as const;

export const DEFAULT_APPETITE: Record<string, number> = Object.fromEntries(
  METRIC_CATALOG.filter((m) => m.editable).map((m) => [m.id, m.defaultThreshold]),
);

const SECURED_TOOLS = [
  "cic_lookup",
  "income_verify",
  "compute_annual_debt_service",
  "compute_dti",
  "sao_ke_parse",
  "property_valuation",
  "land_registry",
  "doc_checklist",
  "compute_ltv",
  "aml_screen",
  "related_party",
];

const UNSECURED_TOOLS = ["core_banking_read", "loan_calculator", "aml_screening"];

type YamlTemplate = Omit<GraphConfig, "id" | "label" | "productCode" | "agentProductId">;

const BASE_APPETITE = { ...DEFAULT_APPETITE };

/** Mirrors packages/shared/aulacys/agents/products/*.yaml */
export const YAML_TEMPLATES: Record<string, YamlTemplate> = {
  "loan-1": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 0.9, term_years_max: 35 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  "loan-2": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 0.9, term_years_max: 35 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  "loan-3": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 1.0, term_years_max: 15 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  "loan-4": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 1.0, term_years_max: 10 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  "loan-5": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 0.9, term_years_max: 8 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  "loan-house-repair": {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 0.8, term_years_max: 10 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  retail_mortgage: {
    agents: ["credit", "operations", "compliance"],
    depends: { compliance: ["operations"] },
    tools: SECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { ltv_cap: 0.9, term_years_max: 35 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "never", else: "hitl" },
  },
  retail_unsecured_salary: {
    agents: ["credit", "compliance"],
    depends: {},
    tools: UNSECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { amount_ceiling: 500_000_000, term_months_max: 60 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "all_rules_pass", else: "hitl" },
  },
  "loan-unsecured-term": {
    agents: ["credit", "compliance"],
    depends: {},
    tools: [
      "cic_lookup",
      "salary_verify",
      "compute_annual_debt_service",
      "compute_dti",
      "aml_screen",
      "related_party",
    ],
    policy: "retail_lending.yaml",
    limits: { amount_ceiling: 500_000_000, term_months_max: 60 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "all_rules_pass", else: "hitl" },
  },
  "loan-unsecured-overdraft": {
    agents: ["credit", "compliance"],
    depends: {},
    tools: UNSECURED_TOOLS,
    policy: "retail_lending.yaml",
    limits: { amount_ceiling: 500_000_000, term_months_max: 12 },
    appetite: { ...BASE_APPETITE },
    gate: { stp_when: "all_rules_pass", else: "hitl" },
  },
};

export type CatalogProductRef = {
  id: string;
  product_code: string;
  product_name: string;
  secured_type?: string | null;
  agent_product_id?: string | null;
  status?: string;
};

export function resolveAgentProductId(product: CatalogProductRef): string {
  if (product.agent_product_id && YAML_TEMPLATES[product.agent_product_id]) {
    return product.agent_product_id;
  }
  if (product.secured_type === "UNSECURED") return "retail_unsecured_salary";
  return "loan-1";
}

export function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
}

export function configFromCatalogProduct(product: CatalogProductRef): GraphConfig {
  const agentProductId = resolveAgentProductId(product);
  const template = YAML_TEMPLATES[agentProductId] ?? YAML_TEMPLATES["loan-1"];
  return {
    id: product.id,
    agentProductId,
    label: product.product_name,
    productCode: product.product_code,
    agents: [...template.agents],
    depends: cloneConfig(template.depends),
    tools: [...template.tools],
    policy: template.policy,
    limits: { ...template.limits },
    appetite: { ...DEFAULT_APPETITE, ...template.appetite },
    gate: { ...template.gate },
  };
}

/** Offline fallback when catalog API is down */
export const GRAPH_PRESETS: GraphConfig[] = [
  {
    id: "retail_mortgage",
    agentProductId: "retail_mortgage",
    label: "Thế chấp mua nhà (HITL + veto)",
    agents: [...YAML_TEMPLATES.retail_mortgage.agents],
    depends: JSON.parse(JSON.stringify(YAML_TEMPLATES.retail_mortgage.depends)),
    tools: [...YAML_TEMPLATES.retail_mortgage.tools],
    policy: YAML_TEMPLATES.retail_mortgage.policy,
    limits: { ...YAML_TEMPLATES.retail_mortgage.limits },
    appetite: { ...DEFAULT_APPETITE },
    gate: { ...YAML_TEMPLATES.retail_mortgage.gate },
  },
  {
    id: "retail_unsecured_salary",
    agentProductId: "retail_unsecured_salary",
    label: "Tín chấp lương (STP)",
    agents: [...YAML_TEMPLATES.retail_unsecured_salary.agents],
    depends: {},
    tools: [...YAML_TEMPLATES.retail_unsecured_salary.tools],
    policy: YAML_TEMPLATES.retail_unsecured_salary.policy,
    limits: { ...YAML_TEMPLATES.retail_unsecured_salary.limits },
    appetite: { ...DEFAULT_APPETITE },
    gate: { ...YAML_TEMPLATES.retail_unsecured_salary.gate },
  },
];

const STORAGE_KEY = "aulacys.graph-config.drafts.v2";

export type GraphImpact = {
  waves: string[][];
  parallelHint: string;
  hasCompliance: boolean;
  hasOpsGate: boolean;
  vetoCapable: boolean;
  gateMode: "stp" | "hitl_always";
  gateHint: string;
  wowHint: string;
  edgeCount: number;
};

export function describeGraphImpact(config: GraphConfig): GraphImpact {
  const agents = config.agents;
  const indegree = new Map<string, number>();
  for (const a of agents) indegree.set(a, 0);
  let edgeCount = 0;
  for (const [dependent, deps] of Object.entries(config.depends)) {
    if (!agents.includes(dependent as AgentId)) continue;
    for (const dep of deps ?? []) {
      if (!agents.includes(dep)) continue;
      edgeCount += 1;
      indegree.set(dependent, (indegree.get(dependent) ?? 0) + 1);
    }
  }

  const remaining = new Set(agents);
  const waves: string[][] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((a) => (indegree.get(a) ?? 0) === 0);
    if (ready.length === 0) {
      waves.push([...remaining]);
      break;
    }
    waves.push(ready.sort());
    for (const a of ready) remaining.delete(a);
    for (const [dependent, deps] of Object.entries(config.depends)) {
      if (!remaining.has(dependent as AgentId)) continue;
      for (const dep of deps ?? []) {
        if (ready.includes(dep)) {
          indegree.set(dependent, Math.max(0, (indegree.get(dependent) ?? 1) - 1));
        }
      }
    }
  }

  const hasCompliance = agents.includes("compliance");
  const hasOpsGate =
    hasCompliance && (config.depends.compliance ?? []).includes("operations");
  const gateMode: GraphImpact["gateMode"] =
    config.gate.stp_when === "never" ? "hitl_always" : "stp";

  const waveLabels = waves.map((w, i) => `Đợt ${i + 1}: ${w.join(" + ")}`).join(" → ");
  const parallelHint =
    waves.some((w) => w.length > 1)
      ? `Có chạy song song — ${waveLabels}`
      : `Tuần tự hoàn toàn — ${waveLabels}`;

  const gateHint =
    gateMode === "hitl_always"
      ? "Luôn qua người duyệt (HITL)"
      : "STP khi mọi rule pass; không pass → HITL";

  const wowHint = hasOpsGate
    ? "Compliance chờ Operations (LTV) rồi mới veto."
    : hasCompliance
      ? "Có Compliance (veto) — không chờ Operations."
      : "Không có Compliance → không veto trên config này.";

  return {
    waves,
    parallelHint,
    hasCompliance,
    hasOpsGate,
    vetoCapable: hasCompliance,
    gateMode,
    gateHint,
    wowHint,
    edgeCount,
  };
}

export function validateGraphConfig(config: GraphConfig): string[] {
  const errors: string[] = [];
  const agentSet = new Set(config.agents);

  for (const agent of config.agents) {
    if (!SPECIALIST_AGENTS.includes(agent)) {
      errors.push(`Agent ngoài whitelist: ${agent}`);
    }
  }

  for (const [dependent, deps] of Object.entries(config.depends)) {
    if (!agentSet.has(dependent as AgentId)) {
      errors.push(`depends.${dependent}: agent không nằm trên canvas`);
      continue;
    }
    for (const dep of deps ?? []) {
      if (!agentSet.has(dep)) {
        errors.push(`${dependent} phụ thuộc ${dep} nhưng ${dep} chưa có trên canvas`);
      }
      if (!SPECIALIST_AGENTS.includes(dep)) {
        errors.push(`Cạnh phụ thuộc ngoài whitelist: ${dependent} ← ${dep}`);
      }
      if (dep === dependent) {
        errors.push(`${dependent} không thể phụ thuộc chính nó`);
      }
    }
  }

  if (hasCycle(config)) {
    errors.push("Phát hiện chu trình phụ thuộc — không hợp lệ");
  }

  for (const tool of config.tools) {
    if (!(TOOL_WHITELIST as readonly string[]).includes(tool)) {
      errors.push(`Tool ngoài whitelist: ${tool}`);
    }
  }

  if (!config.policy.trim()) errors.push("Thiếu policy");
  if (config.agents.length === 0) errors.push("Cần ít nhất một agent chuyên gia");

  return errors;
}

function hasCycle(config: GraphConfig): boolean {
  const visiting = new Set<string>();
  const done = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (done.has(node)) return false;
    visiting.add(node);
    for (const dep of config.depends[node as AgentId] ?? []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(node);
    done.add(node);
    return false;
  }

  return config.agents.some((a) => dfs(a));
}

export function graphConfigToYaml(config: GraphConfig): string {
  const lines: string[] = [
    `# ${config.label}`,
    `# catalog → agents/products/${config.agentProductId}.yaml`,
    `agents: [${config.agents.join(", ")}]`,
  ];

  const dependsEntries = Object.entries(config.depends).filter(([, v]) => (v?.length ?? 0) > 0);
  if (dependsEntries.length > 0) {
    lines.push("depends:");
    for (const [agent, deps] of dependsEntries) {
      lines.push(`  ${agent}: [${(deps ?? []).join(", ")}]`);
    }
  }

  if (config.tools.length <= 3) {
    lines.push(`tools: [${config.tools.join(", ")}]`);
  } else {
    lines.push("tools:");
    for (const tool of config.tools) lines.push(`  - ${tool}`);
  }

  lines.push(`policy: ${config.policy}`);

  const limitKeys = Object.keys(config.limits);
  if (limitKeys.length > 0) {
    lines.push("limits:");
    for (const key of limitKeys) lines.push(`  ${key}: ${config.limits[key]}`);
  }

  const appetiteKeys = Object.keys(config.appetite ?? {});
  if (appetiteKeys.length > 0) {
    lines.push("# appetite — khẩu vị ngân hàng (không phải luật)");
    lines.push("appetite:");
    for (const key of appetiteKeys) lines.push(`  ${key}: ${config.appetite[key]}`);
  }

  lines.push("gate:");
  lines.push(`  stp_when: ${config.gate.stp_when}`);
  lines.push(`  else: ${config.gate.else}`);
  lines.push("");
  return lines.join("\n");
}

export function loadDrafts(): Record<string, GraphConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GraphConfig>;
  } catch {
    return {};
  }
}

export function saveDraft(config: GraphConfig): void {
  if (typeof window === "undefined") return;
  const drafts = loadDrafts();
  drafts[config.id] = cloneConfig(normalizeConfig(config));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function clearDraft(id: string): void {
  if (typeof window === "undefined") return;
  const drafts = loadDrafts();
  delete drafts[id];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function normalizeConfig(config: GraphConfig): GraphConfig {
  return {
    ...config,
    appetite: { ...DEFAULT_APPETITE, ...(config.appetite ?? {}) },
    limits: { ...(config.limits ?? {}) },
    depends: config.depends ?? {},
    tools: config.tools ?? [],
  };
}

export function resolveInitialConfig(product: CatalogProductRef): GraphConfig {
  const drafts = loadDrafts();
  if (drafts[product.id]?.agentProductId) {
    return normalizeConfig(cloneConfig(drafts[product.id]));
  }
  return configFromCatalogProduct(product);
}
