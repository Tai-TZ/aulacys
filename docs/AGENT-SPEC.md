# AGENT-SPEC — the 5-role multi-agent contract (RULE)

> **📌 DECIDED — binding.** This is what each agent IS: model tier, responsibility, tool
> whitelist, KB, veto power. The graph, nodes, and specs MUST match this table. Points to
> `AGENTS.md`; obeys `LOAN-SOP.md` §0 invariants and `CLEAN-ARCHITECTURE.md` layering.
> Change = team decision, logged in `docs/TEAM_RULES.md`.

## 0. Repositioning (one line)
From *"a compliance-veto demo"* → **a 5-role multi-agent underwriting system with a
deterministic core: the LLM only reasons and writes prose; every number and every veto comes
from a tool or from policy.** Multi-agent = 5 specialists with least-privilege tools + a strong
Planner/Critic pair, not 5 chatbots.

---

## 1. The contract

| Agent | Model tier | Trách nhiệm | Tool whitelist | KB | Veto |
|---|---|---|---|---|---|
| **Planner** | **mạnh** | Phân rã request → DAG · định tuyến · nhận veto → **lập lại kế hoạch** | — (none) | — | — |
| **Credit** | nhỏ/nhanh | Thẩm định tài chính · đề xuất **hạn mức + lãi suất** | core-bank (read), CIC, loan-calculator | Credit KB | — |
| **Compliance** | nhỏ/nhanh | KYC/UBO · sàng lọc AML · giới hạn luật định | AML screening, core-bank (read) | Compliance KB | **✅ phủ quyết** |
| **Operations** | nhỏ/nhanh | Checklist chứng từ · đặt lịch định giá · **tạo ticket** | ticket/workflow (**write**), core-bank (read) | Ops KB | — |
| **Critic** | **mạnh** | Kiểm chứng mọi finding có bằng chứng · **tổng hợp tờ trình** · **lên kế hoạch sửa** | — (đọc tất để verify) | đọc-all | — |

---

## 2. Model tier ⨯ invariant (đọc kỹ — không phá LOAN-SOP §0)

"Model tier" chỉ quyết định **phần prose/suy luận**. **Số & veto luôn deterministic** (cờ
`llm_prose`). Model không bao giờ đẻ số hay veto.

| Agent | Model dùng để | Vẫn deterministic (không model) |
|---|---|---|
| Planner (mạnh) | chọn tuyến khi config có nhiều lựa chọn + viết lý do kế hoạch | **cấu trúc DAG** từ config; trigger replan = **edge** từ veto |
| Credit (mini) | viết *nhận định* tín dụng | DTI, lãi suất, hạn mức = **tool** |
| Compliance (mini) | diễn giải vi phạm | **veto + rule eval** = policy-as-code |
| Operations (mini) | ghi chú tình trạng hồ sơ | checklist, định giá, **ghi ticket** = tool |
| Critic (mạnh) | **soạn tờ trình** + **draft kế hoạch sửa** | **pass/fail verify** = rule deterministic |

→ `llm_prose=True` chỉ mở **field prose**; output cấu trúc (DAG, `CriticVerdict.passed`, số) vẫn
từ code. Cắm key = thêm văn, không đổi quyết định.

---

## 3. Vòng lặp Critic → Planner (mới: "lên kế hoạch sửa")
```
agents chạy → Critic verify
   ├─ pass  → tổng hợp Tờ trình (prose, model mạnh) → gate
   └─ fail  → Critic DRAFT kế hoạch sửa (finding → hành động) 
              → Planner đọc plan → replan (điều chỉnh phương án / bổ sung tool call)
```
Critic không sửa output của agent (chỉ audit) — nó **đề xuất** sửa; Planner thực thi. Giữ
separation. Đây là bản nâng của vòng veto→replan hiện có.

---

## 4. Đối chiếu hiện trạng (tóm tắt audit)

| Tiêu chí | Planner | Credit | Compliance | Operations | Critic |
|---|---|---|---|---|---|
| Model tier | ❌ 0 model | ❌ | ❌ | ❌ | ❌ |
| Trách nhiệm lõi | ⚠️ DAG không execute | ⚠️ **thiếu lãi suất** | ⚠️ **thiếu KYC/UBO** | ⚠️ **ticket sai chủ** | ⚠️ **không soạn tờ trình / plan sửa** |
| Tool whitelist | ✅ | ⚠️ core-bank mock | ⚠️ | ❌ thiếu write-ticket | ✅ |
| KB | — ✅ | ❌ rỗng | ❌ rỗng | ❌ rỗng | ✅ đọc-all |
| Veto | — | — | ✅ | — | — |

Nền đúng: tách role, whitelist enforce (`dispatch`), veto policy-as-code, replan loop, Critic-verify.

---

## 5. Kế hoạch sửa (phân pha — demo-proof, giữ invariant)

| Pha | Việc | File | Đạt cột spec |
|---|---|---|---|
| **A1 — model-tier infra** | Thêm `model_tier: "strong"\|"mini"` vào `AgentSpec`; `config.py` thêm `strong_model`/`mini_model`; `get_llm(tier)` chọn model; runner truyền tier | `specs/base.py`, `config.py`, `services/llm.py`, `harness/runner.py` | Model cột tất |
| **A2 — prose fields** | Thêm field prose (`rationale`/`narrative`) cho Planner & Critic; set `llm_prose=True` cho 2 agent này | `state.py`, `nodes/planner.py`, `nodes/critic.py` | Planner/Critic mạnh |
| **B — Credit pricing** | `price_loan` tool (base+CIC group+kỳ hạn+risk premium, floor/cap PNL) → Credit trả `proposed_rate`+`limit` | `tools/pricing.py`, `nodes/credit.py`, product YAML `pricing:` | Credit: lãi suất |
| **C — ticket về Ops** | Đưa `write_approval_ticket` vào Ops whitelist + node; graph gọi Ops ghi ticket thay orchestrator | `nodes/operations.py`, `graph.py` | Ops: tạo ticket |
| **D — Critic soạn tờ trình + plan sửa** | `CreditMemo` (assemble số từ tool + narrative model mạnh); trên fail → `remediation_plan` (finding→action) đẩy Planner | `state.py`, `nodes/critic.py`, `tools/credit_memo.py`, `graph.py` | Critic: tờ trình + plan |
| **E — Compliance KYC/UBO** | Thêm KYC gate (eKYC mock) + UBO qua `related_party`; screen sớm | `nodes/compliance.py` (hoặc intake) | Compliance: KYC/UBO |
| **F — KB/RAG** | Namespace KB thật (Credit/Compliance/Ops): retriever + corpus → feed prose + citation (KHÔNG feed số/veto) | mới `agents/kb/*`, `nodes/*` | KB cột 3 agent |
| **G — DAG execute** | LangGraph node + conditional edge; Credit‖Operations `gather`; veto = edge | `graph.py` | Planner: routing thật |

**Thứ tự đề xuất:** A1→A2 (nền model-tier, rẻ) → B (pricing) → C (ticket) → D (tờ trình+plan sửa,
đây là "wow" nghiệp vụ) → E → F (lớn nhất) → G.

Mỗi pha: fallback deterministic + test + handoff (`AGENTS.md` §2/§7). Không thêm dep chưa duyệt.

---

## 6. Ranh giới không đổi (🔒)
- Số/veto **luôn** tool/policy — model chỉ prose (LOAN-SOP §0).
- Whitelist enforce ở `dispatch`, không ở prompt.
- Critic **audit + đề xuất**, không tự sửa output (separation).
- core-banking thật = out-of-scope (`AGENTS.md` §0) → mock read qua CIC/income seed.

## 7. Wiring (đề xuất — chờ duyệt)
Trỏ `AGENTS.md` §0/§4 → file này; log `docs/TEAM_RULES.md`.
