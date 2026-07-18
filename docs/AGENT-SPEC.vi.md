# AGENT-SPEC — Hợp đồng năm Agent

> Hợp đồng vai trò ràng buộc cho hệ thống multi-agent hiện tại. File này định nghĩa
> từng agent đang có làm gì, được đọc/gọi gì, và phải xuất ra gì. File **không**
> thêm agent mới cho mọi giai đoạn vòng đời khoản vay.

## 0. Định vị

Hệ thống là **workflow vòng đời khoản vay, vận hành bởi lõi quyết định năm agent**.

Vòng đời:

1. Tiếp nhận (Intake) — nhận dữ liệu hồ sơ và chứng từ.
2. Đề xuất (Proposal) — tạo hoặc chỉnh phương án vay đề nghị.
3. Thẩm định agent (Agent review) — năm agent đánh giá đề xuất, chứng từ, pháp lý/tuân thủ và bằng chứng.
4. Phê duyệt (Approval) — hồ sơ sạch đi STP; hồ sơ rủi ro đi HITL.
5. Giải ngân (Disbursement) — chỉ thực hiện khi đã phê duyệt và kiểm tra cuối cùng đạt.

Phân biệt quan trọng:

```text
Giai đoạn vòng đời ≠ một agent mới.
```

Năm agent vẫn là:

`Planner`, `Credit`, `Operations`, `Compliance`, `Critic`.

Cần **mở rộng** chúng để hỗ trợ đủ vòng đời, không nhân bản thêm agent
trừ khi yêu cầu sau này chứng minh cần agent tách riêng.

## 1. Bất biến không thương lượng

| Quy tắc | Ý nghĩa |
|---|---|
| LLM không bao giờ đẻ số | DTI, LTV, khoản trả, hạn mức, lãi suất, metric rủi ro đến từ tool tất định. |
| LLM không bao giờ đẻ veto | Quyết định chặn đến từ policy-as-code và cạnh trong graph. |
| Planner điều phối, không thẩm định | Planner tạo DAG, định tuyến, nhận veto và lập lại kế hoạch. |
| Whitelist tool do harness enforce | Quyền nằm trong code (`dispatch` / facade map), không nằm trong prompt. |
| Luồng nằm trong config | Khác biệt sản phẩm là YAML/config, không phải nhánh `if product == ...`. |
| Critic kiểm chứng, không sửa | Critic kiểm bằng chứng và viết memo/khắc phục; không sửa output của agent khác. |

## 2. Năm Agent

| Agent | Tầng model | Trách nhiệm | Quyền tool | KB | Veto |
|---|---|---|---|---|---|
| Planner | mạnh | Phân rã request thành DAG, định tuyến, nhận veto, replan. | không | không | không |
| Credit | mini | Kiểm phương án vay có hợp lý về tài chính: CIC, thu nhập, DTI, khoản trả, hạn mức, lãi, kỳ hạn, rủi ro định giá. | `core_banking_read`, `loan_calculator` | Credit KB | không |
| Operations | mini | Kiểm sẵn sàng vận hành: chứng từ, thiếu sót, lịch định giá, kiểm TSBĐ/đăng ký, ticket workflow. | `core_banking_read`, `workflow_write` | Ops KB | không |
| Compliance | mini | Kiểm KYC/UBO, AML, giới hạn pháp lý/policy, mục đích cấm, metric LTV/trần. | `core_banking_read`, `aml_screening` | Compliance KB | có |
| Critic | mạnh | Kiểm mọi số/phát hiện có bằng chứng, tổng hợp memo, liệt kê hành động khắc phục. | không | đọc mọi KB | không |

## 3. Đầu vào và đầu ra của từng Agent

### Planner

**Đọc**

- hồ sơ (application)
- cấu hình sản phẩm
- trạng thái run hiện tại
- trạng thái veto/replan

**Xuất**

```text
DAG
- nodes: các node agent theo thứ tự
- edges: phụ thuộc giữa các agent
- rationale: diễn giải kế hoạch bằng prose
```

Planner **không** tính DTI, chọn lãi, phê duyệt, veto, hay ghi ticket.

### Credit

Credit trả lời:

> “Phương án vay đề nghị có hợp lý về tài chính với khách hàng này không?”

Không chỉ kiểm khách hàng; còn kiểm **đề xuất**:

- số tiền yêu cầu
- hạn mức đề nghị
- lãi suất năm đề nghị
- kỳ hạn (tháng)
- khoản trả hàng tháng
- DTI
- nhóm/điểm CIC
- risk premium từ CIC/kỳ hạn/DTI
- khả năng trả nợ

**Đọc**

- application và dữ liệu khách khai báo
- chứng từ như sao kê lương / sao kê tài khoản
- cấu hình định giá sản phẩm
- các trường đề xuất hiện có (nếu có)

**Gọi**

- `cic_lookup`
- `income_verify` / `salary_verify`
- `compute_annual_debt_service`
- `compute_dti`
- `price_loan`

**Xuất**

```text
CreditAssessment
- dti
- income
- proposed_limit
- proposed_rate
- recommendation: support | manual_review | review
- rationale
- evidence[]
- tool_results{}
```

Credit **không** phê duyệt khoản vay và **không** veto vì lý do pháp lý.

### Operations

Operations trả lời:

> “Hồ sơ này có thể chuyển tiếp về mặt vận hành không, và cần tạo work item gì?”

**Đọc**

- application
- danh sách chứng từ
- chứng từ bắt buộc theo sản phẩm
- dữ liệu TSBĐ khi có

**Gọi**

- `doc_checklist`
- `schedule_valuation`
- `property_valuation`
- `land_registry`
- `write_approval_ticket`

**Xuất**

```text
OperationsReport
- valuation
- valuation_task
- doc_status
- missing[]
- legal_flags[]
- evidence[]
- tool_results{}
```

Operations **không** quyết khả năng trả nợ và **không** ban hành veto pháp lý.

### Compliance

Compliance trả lời:

> “Có lý do tuân thủ/pháp lý cứng buộc dừng đề xuất này không?”

**Đọc**

- application
- output của Credit
- output của Operations
- policy rules
- đầu vào KYC/UBO/AML

**Gọi**

- `kyc_check`
- `ubo_check`
- `aml_screen`
- `related_party`
- `compute_ltv` như metric đưa vào policy
- `policy.evaluate`

**Xuất**

```text
ComplianceVerdict
- violations[]
- veto
- rule_ids[]
- kyc_status
- ubo_status
- citations[]
- tool_results{}
```

Compliance là agent duy nhất hiện có quyền veto.

### Critic

Critic trả lời:

> “Ngân hàng có thể tin kết quả này không, và người cần đọc/sửa gì?”

**Đọc**

- application
- output Credit
- output Operations
- output Compliance
- bằng chứng trace/tool
- mọi namespace KB khi có knowledge service

**Gọi**

- không

**Xuất**

```text
CriticVerdict
- passed
- rejections[]
- memo
- remediation_plan[]
```

Critic **không** gọi tool bên ngoài và **không** sửa output của agent khác.

## 4. Ánh xạ vòng đời — không thêm Agent

| Giai đoạn vòng đời | Chủ sở hữu hiện tại | Ghi chú |
|---|---|---|
| Tiếp nhận | `application-svc`, UI, kiểm tra Operations | Đã có dữ liệu mẫu có cấu trúc. OCR ngoài scope. |
| Đề xuất | Credit + tool đề xuất/định giá tất định | Làm dưới dạng object/stage `LoanProposal`, chưa cần agent RM mới. |
| Thẩm định agent | Planner, Credit, Operations, Compliance, Critic | Đây là lõi multi-agent hiện tại. |
| Phê duyệt | cổng policy/config + endpoint phê duyệt người | Không để LLM phê duyệt khoản vay. |
| Giải ngân | service/action tất định trong tương lai | Không biến giải ngân thành quyết định LLM. |

Bước triển khai tiếp theo nên là **object/stage**, không phải thêm agent:

1. Thêm `LoanProposal` để biểu diễn đầu vào RM/đề xuất.
2. Để Credit kiểm đề xuất và trả điều khoản chấp nhận/điều chỉnh.
3. Thêm `ApprovalGate` định tuyến tất định theo policy/config.
4. Thêm `DisbursementAction` ghi sổ tất định kèm audit.

## 5. Facade quyền

Agent spec lộ facade quyền logic. Harness bung facade lúc `dispatch`,
trong khi trace ghi lại lời gọi tool vật lý để audit.

| Facade | Tool / action vật lý |
|---|---|
| `core_banking_read` | `cic_lookup`, `income_verify`, `salary_verify`, `sao_ke_parse`, `kyc_check`, `ubo_check`, `compute_ltv`, `doc_checklist`, `property_valuation`, `land_registry` |
| `loan_calculator` | `compute_annual_debt_service`, `compute_dti`, `price_loan` |
| `aml_screening` | `aml_screen`, `related_party` |
| `workflow_write` | `schedule_valuation`, `write_approval_ticket` |

File triển khai hiện tại:

`packages/shared/aulacys/agents/harness/permissions.py`

## 6. Chính sách tầng Model

| Tầng | Agent dự kiến | Mặc định |
|---|---|---|
| mạnh (strong) | Planner, Critic | Model Gemini mạnh/prose khi cấu hình |
| mini | Credit, Operations, Compliance | `gemini-3.1-flash-lite` mặc định |
| tất định (deterministic) | tool, policy, quyết định graph, cổng phê duyệt/giải ngân | không LLM |

OpenAI vẫn là nhà cung cấp dự phòng. Tầng model **không** thay đổi nguồn tất định của số hay veto.

## 7. Hiện tại vs bước tiếp

| Khu vực | Hiện tại | Bước tiếp tốt hơn |
|---|---|---|
| Đề xuất | Gộp trong field định giá của Credit | Thêm object I/O `LoanProposal`. |
| Credit | Tính/kiểm DTI, pricing, hạn mức/lãi | Làm rõ vai trò kiểm tính hợp lý của đề xuất. |
| Phê duyệt | Outcome + ticket HITL | Thêm `ApprovalGate` config tất định. |
| Giải ngân | Chưa có action | Thêm service/action giải ngân tất định sau phê duyệt. |
| KB/RAG | Đã lên kế hoạch, chưa thật | Thêm `knowledge-svc` chỉ cho citation; policy vẫn là nguồn veto. |

## 8. Ranh giới

- Chưa thêm `RM Proposal Agent`, `Approval Agent`, hay `Disbursement Agent`.
- **Có** thêm schema và stage tất định cho đề xuất / phê duyệt / giải ngân.
- Tích hợp core-banking thật vẫn ngoài scope hackathon.
- OCR vẫn ngoài scope; chấp nhận dữ liệu mẫu có cấu trúc hoặc payload `application-svc`.
- Giữ nhánh veto/replan xanh trước khi thêm giai đoạn vòng đời mới.

---

> Bản dịch tiếng Việt của [`AGENT-SPEC.md`](./AGENT-SPEC.md). Khi hai bản lệch nhau, **bản tiếng Anh là nguồn chính**.
