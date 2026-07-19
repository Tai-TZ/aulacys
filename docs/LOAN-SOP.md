# LOAN-SOP — Canonical retail lending process (RULE)

> **📌 DECIDED — binding.** This is the authoritative loan-origination process the system
> implements. Agents, nodes, graph edges, and product configs MUST follow this sequence and
> these control points. This file and [`FLOW-BUSINESS-CONFIRMED.md`](./FLOW-BUSINESS-CONFIRMED.md)
> are the active business-process references. Agent responsibilities live in [`AGENT-SPEC.md`](./AGENT-SPEC.md).
> Change = team decision, logged in `docs/TEAM_RULES.md` (`AGENTS.md` §3).
>
> **Product anchor:** vay **tín chấp lương** (unsecured salary). Mortgage deltas: §6.
> **Legal citations** (TT39/2016, TT02/2013 + TT31/2024, NĐ13/2023) are **business signposts,
> not verified statute** — treat like `policy/rules/*.yaml` `verified: false` until a human
> checks the article. Don't quote a threshold on stage while it's unverified.

---

## 0. Invariants (🔒 apply to every stage)

1. **LLM never produces a number.** Rates, DTI, PD, valuations come from deterministic tools.
   LLM writes prose (nhận định) only. (`AGENTS.md` §0 rule 1.)
2. **Hard limits are policy-as-code**, evaluated by `policy/`, not by a prompt.
3. **Every step is audited** (append-only ledger).
4. **Flow lives in config** (`agents/products/*.yaml`) — no `if product == …` in the graph.
5. **Demo-proof:** every external call (CIC, LOS, LLM, DB) has a deterministic fallback.
6. **Separation of duties:** the agent/officer that *proposes* never *approves*.

---

## 1. STAGE 1 — TIẾP NHẬN (Intake)

Đầu vào: Đơn đề nghị vay tín chấp, CCCD, sao kê lương ≥3 tháng, HĐLĐ/QĐ bổ nhiệm.

| #   | Bước                                                               | Control / tool                                             |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1.1 | Thu & đọc hồ sơ, trích xuất thông tin                         | (extract — OCR ngoài scope, dùng`Document.extracted`) |
| 1.2 | **Lấy đồng ý tra CIC** (consent)                           | `cic_consent` gate → chưa đồng ý ⇒ dừng           |
| 1.3 | Đối chiếu khớp: declared vs chứng từ (thu nhập, tên)         | `accuracy_check` *(build)*                             |
| 1.4 | Kiểm tra đủ hồ sơ**→ khởi tạo Tờ trình tín dụng**  | `doc_checklist` + `credit_memo` (phần A)              |
| —  | Thiếu / không khớp ⇒**yêu cầu bổ sung** (loop lại 1.1) |                                                            |

**OUT:** **Tờ trình tín dụng** (bản khởi tạo — mới có thông tin hồ sơ, chưa có kết quả thẩm định).

---

## 2. STAGE 2 — THẨM ĐỊNH (Appraisal)

Đầu vào: Tờ trình (bản khởi tạo).

| #   | Bước                                                                                                                                                                                                | Control / tool                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 2.1 | **Tra CIC** → nhóm nợ, dư nợ hiện hữu, score/PD                                                                                                                                          | `cic_lookup` + scorecard                      |
| 2.2 | **Tính DTI** = (nợ CIC + nợ khai + khoản mới) / thu nhập verify                                                                                                                           | `compute_dti` — **phải gồm nợ CIC** |
| 2.3 | **Đủ điều kiện?** DTI≤cap · nguồn trả nợ · phương án vốn · nhóm nợ                                                                                                            | → decision`{approve / reject / refer}`       |
| 2.4 | **Định lãi suất** = base + f(hạng, kỳ hạn, CIC, risk premium)                                                                                                                            | `price_loan` *(build)*                      |
| —  | Ràng buộc**floor** = giá vốn + tổn thất kỳ vọng(PD) + opex + biên tối thiểu; **cap** = trần quy định/khẩu vị. **Cân đối PNL** (lãi bù đủ rủi ro + chi phí) | pricing config trong product YAML               |
| 2.5 | **Compliance / veto** (mục đích cấm, exposure, hạn mức, AML)                                                                                                                              | `policy.evaluate` → vi phạm cứng ⇒ veto   |
| —  | Vi phạm ⇒**điều chỉnh phương án** (giảm hạn mức/kỳ hạn) rồi tính lại (cap số vòng)                                                                                            | (không phải "replan" tuỳ tiện)              |
| 2.6 | **Hoàn chỉnh Tờ trình** (số từ tool; nhận định = prose LLM)                                                                                                                            | `credit_memo` (phần B)                       |

**OUT:** **Tờ trình tín dụng hoàn chỉnh** + đề xuất điều khoản. **KHÔNG phải hợp đồng.**

---

## 3. STAGE 3 — PHÊ DUYỆT (Approval — người, dynamic theo khẩu vị)

| #   | Bước                                                                          | Control                                              |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 3.1 | không làm: Chọn cấp duyệt theo hạn mức                                   | authority matrix*(build)*                            |
| 3.2 | Người duyệt (**≠ người thẩm định**) xem tờ trình + kết quả   | separation of duties                                 |
| 3.3 | Quyết định:**approve / reject / yêu-cầu-bổ-sung** (→ loop stage 1) | `/approvals` + `needs_more_info` *(build)*     |
| 3.4 | Nếu**approve** ⇒ **lập Hợp đồng tín dụng**                  | `gen_contract` *(build)* — **SAU duyệt** |

Dynamic HITL: `gate.stp_when` (STP vs HITL theo sản phẩm). **OUT:** Hợp đồng tín dụng (đã ký).

---

## 4. STAGE 4 — GIẢI NGÂN (Disbursement)

| #   | Bước                                                                                   | Control / tool                                                        |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 4.1 | **Điều kiện tiên quyết**: ký HĐ, đóng phí, chứng từ mục đích        | conditions precedent                                                  |
| 4.2 | **RE-CHECK CIC** (có thể xấu đi từ lúc duyệt)                               | `cic_lookup` lại → xấu đi ⇒ **DỪNG, tái thẩm định** |
| 4.3 | Kiểm tra **window 3–6 tháng** kể từ ngày duyệt                             | `disbursement.window_months`                                        |
| 4.4 | **Giải ngân** (1 hoặc nhiều lần) — mỗi lần đúng mục đích + chứng từ | `book_disbursement` *(build)*, multi-tranche                      |
| —  | Auto nếu gate cho phép, else qua duyệt                                                | `disbursement.auto` (config)                                        |

**OUT:** **Khế ước nhận nợ.**

---

## 5. HẬU GIẢI NGÂN (ngoài scope demo — gap ghi nhận)

5.1 Giám sát nợ · phân loại nợ định kỳ (TT02/TT31) · nhắc/thu hồi · xử lý quá hạn.

---

## 6. Delta sản phẩm THẾ CHẤP (mortgage)

Cơ chế **giống hệt**, chỉ khác *metric* + thêm chốt (đều qua config/policy, không code riêng):

- Thêm **định giá TSBĐ** (`property_valuation`) + **thẩm tra pháp lý sổ đỏ** (`land_registry`).
- Thêm **LTV** = khoản vay / giá trị TSBĐ, veto nếu > `limits.ltv_cap`.
- **Mục đích** chặt hơn (mua nhà để ở vs tất toán TCTD khác = mục đích cấm).
- **Đăng ký giao dịch bảo đảm** = điều kiện tiên quyết giải ngân (4.1).
- Kỳ hạn dài, giải ngân theo tiến độ.

---

## 7. Chứng từ đầu ra (artifact) theo stage

| Artifact               | Tạo ở                            | Tool                  | Ghi chú                   |
| ---------------------- | ---------------------------------- | --------------------- | -------------------------- |
| Tờ trình tín dụng  | 1.4 khởi tạo → 2.6 hoàn chỉnh | `credit_memo`       | 1 văn bản, 2 pha         |
| Hợp đồng tín dụng | 3.4 (sau duyệt)                   | `gen_contract`      | không lập trước duyệt |
| Khế ước nhận nợ   | 4.4 (mỗi lần giải ngân)        | `book_disbursement` | multi-tranche              |

---

## 8. Đối chiếu code (có / cần build)

| Bước                                          | Trạng thái                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| CIC + scorecard + consent (1.2, 2.1)            | ✅ có                                                                              |
| DTI (2.2)                                       | ⚠️ có nhưng**bỏ nợ CIC** — phải sửa `compute_dti` gồm dư nợ CIC |
| Chặn nhóm nợ ≥3 (2.3)                       | ❌ thêm policy rule`cic_group <= 2` blocking                                     |
| Compliance veto / exposure (2.5)                | ✅ có (`policy.evaluate`)                                                        |
| Định lãi suất + floor/cap + PNL (2.4)       | ❌`price_loan` + `pricing:` YAML                                                |
| Tờ trình (1.4/2.6)                            | ❌`credit_memo` (assemble deterministic + prose)                                  |
| Authority matrix (3.1)                          | ❌                                                                                  |
| Approve/reject/needs_more_info (3.3)            | ⚠️`/approvals` có; thêm `needs_more_info`                                   |
| Hợp đồng sau duyệt (3.4)                    | ❌`gen_contract`                                                                  |
| Giải ngân + re-check + window + tranche (4.x) | ❌`check_disbursement` + `book_disbursement`                                    |
| Khế ước nhận nợ (OUT stage 4)              | ❌                                                                                  |
| Hậu giải ngân (5.1)                          | ❌ (ngoài scope)                                                                   |

---

## 9. Open points cần team chốt (non-blocking)

1. **Vị trí AML/KYC:** bản này để AML trong Compliance stage 2 (2.5). Best-practice nghiệp vụ là
   sàng lọc AML/cấm vận **ngay tiếp nhận** (không nhận hồ sơ khách cấm vận). Giữ 2.5 hay đẩy lên 1?
2. **Tờ trình 2 pha** (khởi tạo 1.4 / hoàn chỉnh 2.6) — xác nhận đây là 1 văn bản sống, không phải 2.
3. **Công thức floor PNL** (2.4): chốt thành phần `giá vốn / PD·LGD / opex / biên` bằng số cụ thể.
4. **"Điều chỉnh phương án"** (2.5) — giữ cơ chế lặp (thay cho "replan") ở mức nào (cap vòng).

---

## 10. Wiring (đề xuất — chưa làm, cần duyệt)

- Thêm 1 dòng trỏ trong `AGENTS.md` §0 → file này (canonical process). *(§4 blast-radius: cần announce.)*
- Log quyết định vào `docs/TEAM_RULES.md` → Decisions.
