# Quy trình nghiệp vụ đã confirm — Vay tín chấp tiêu dùng (bán lẻ)

> **Trạng thái:** 📌 DECIDED — confirm với team (2026-07-18).  
> **Sản phẩm neo:** vay tín chấp / tiêu dùng cá nhân (STP có thể). Thế chấp = cùng khung stage,
> thêm LTV / định giá / pháp lý TSBĐ (xem [`FLOW-BUSINESS-REVIEW.md`](./FLOW-BUSINESS-REVIEW.md) §7).  
> **Liên quan:** draft cũ [`FLOW-PROCESS-LOAN.md`](./FLOW-PROCESS-LOAN.md) · review
> [`FLOW-BUSINESS-REVIEW.md`](./FLOW-BUSINESS-REVIEW.md) · plan kỹ thuật
> [`PLAN-LOAN-LIFECYCLE.md`](./PLAN-LOAN-LIFECYCLE.md).

---

## Tóm tắt 5 stage

| # | Stage | Ai làm | Output chính |
|---|--------|--------|--------------|
| 1 | Tiếp nhận hồ sơ | Hệ thống (+ data mẫu sẵn) | Bộ hồ sơ / tờ trình đầu vào |
| 2 | RM đề xuất | **Agent** (+ RM chỉnh tay) | Phương án vay (số tiền, kỳ hạn, LS, DTI, rủi ro) |
| 3 | Thẩm định | **Agent** (+ chuyên viên khi cần) | Kết luận thẩm định phương án |
| 4 | Phê duyệt | **Agent STP** *hoặc* **người** | Quyết định approve / reject / bổ sung |
| 5 | Giải ngân | **Auto** (tín chấp tiêu dùng) | Giải ngân / khế ước nhận nợ |

```
[1 Tiếp nhận] → [2 RM đề xuất] → [3 Thẩm định] → [4 Phê duyệt] → [5 Giải ngân]
     ↑ sample data      ↑ Agent + edit      ↑ validate PA     ↑ STP | HITL      ↑ auto tín chấp
```

---

## 1. Tiếp nhận hồ sơ

**Hiện trạng demo:** đã có **data mẫu sẵn** (seed / bộ hồ sơ demo) — không cần OCR thật
(`AGENTS.md` §0: full OCR out of scope).

**Đầu vào điển hình (tín chấp lương / tiêu dùng):**

- Đơn đề nghị vay theo mẫu ngân hàng
- CCCD/CMND còn hiệu lực
- Sao kê / bảng lương ≥ 3 tháng (nếu theo sản phẩm lương)
- HĐLĐ / quyết định bổ nhiệm (nếu yêu cầu sản phẩm)

**Chốt tối thiểu trước khi sang stage 2:**

- Hồ sơ đủ theo checklist sản phẩm
- Đồng ý tra CIC (`cic_consent`) — bắt buộc pháp lý
- *(Khuyến nghị production, có thể ngoài demo: KYC + AML sàng lọc đầu vào)*

**Output:** bộ hồ sơ / tờ trình đầu vào sẵn sàng cho RM đề xuất.

---

## 2. RM đề xuất (input cho thẩm định)

**Vai trò:** Agent đóng vai RM — lập **phương án cho vay** làm đầu vào thẩm định.  
RM (hoặc user demo) **được chỉnh lại** các input đề xuất trước khi gửi thẩm định.

### Agent tự làm

| Việc | Chi tiết |
|------|----------|
| Tra CIC | Nhóm nợ / điểm (score band) — nguồn `cic-svc` hoặc fallback |
| Tính DTI | Debt-to-Income — xem mục **DTI** bên dưới |
| Phương án vay | Số tiền, mục đích, cấu trúc trả nợ đề xuất |
| Kỳ hạn | Tháng / năm theo khẩu vị sản phẩm + hồ sơ |
| Lãi suất | Từ **CIC (điểm / nhóm)** + kỳ hạn + risk premium |
| Set rủi ro lãi suất | Risk premium / band rủi ro — **user chỉnh được** |

### Thứ tự số đúng nghiệp vụ (không đảo)

```
CIC (nhóm/điểm) → pricing sơ bộ (LS) → khoản trả tháng (gồm khoản mới)
  → DTI (nợ hiện hữu + khoản mới) → đủ điều kiện sơ bộ?
```

Lãi suất phụ thuộc scoring; nghĩa vụ tháng phụ thuộc lãi suất; DTI phụ thuộc nghĩa vụ tháng.
**Không** tính DTI trước rồi mới gắn LS.

### DTI — Debt to Income

Tham chiếu công thức phổ biến ([Home Credit — DTI là gì?](https://www.homecredit.vn/blog/ty-le-no-tren-thu-nhap-dti-la-gi-101)):

```
DTI = Tổng nghĩa vụ nợ phải trả hàng tháng / Tổng thu nhập hàng tháng
```

- **Tử số:** mọi khoản trả tháng hiện hữu (**ưu tiên từ CIC**, không chỉ nợ khai báo) **+** khoản trả của phương án mới.
- **Mẫu số:** thu nhập tháng đã xác minh / khai báo theo sản phẩm.
- **Ngưỡng tham chiếu thị trường (tham khảo, không thay policy nội bộ):**
  - &lt; 36% — lý tưởng
  - 37–42% — cân nhắc
  - 43–49% — rủi ro cao
  - ≥ 50% — báo động  
  → **Ngưỡng chặn thật** nằm trong `policy/` / product YAML (`limits.dti_cap`), không hard-code trong prompt.

### Output stage 2

**Phương án cho vay (editable):** số tiền, kỳ hạn, lãi suất đề xuất (+ breakdown), DTI, CIC
tóm tắt, risk premium — sẵn sàng làm **input stage 3**.

---

## 3. Thẩm định

**Đầu vào:** phương án cho vay từ stage 2 (không tự bịa số mới ngoài tool).

**Thẩm định kiểm tra:**

1. **Phương án đề xuất có hợp lý không** — khớp hạn mức sản phẩm, kỳ hạn, LS floor/cap, DTI/LTV (nếu có), khẩu vị rủi ro.
2. **Legal của user** — pháp lý / blacklist / mục đích cấm / related-party (theo tool + policy).
3. **Khả năng trả nợ** — DTI + nguồn thu nhập + nợ CIC / nhóm nợ; veto nếu vượt hard limit trong policy.

**Output:** kết luận thẩm định + tờ trình tín dụng (số từ tool; nhận định = prose).  
**Không** lập hợp đồng tín dụng ở stage này — hợp đồng chỉ sau khi **đã phê duyệt** (stage 4).

---

## 4. Phê duyệt

**Nguyên tắc:** phê duyệt **động theo khẩu vị / profile**, không hard-code mọi hồ sơ phải người.

| Điều kiện | Ai duyệt |
|-----------|----------|
| Profile đẹp / hoàn hảo, mục đích nhỏ / đơn giản, rủi ro thấp (STP) | **Agent** xem & duyệt |
| Hồ sơ không đẹp, có khả năng rủi ro, vượt ngưỡng gate | **Người** duyệt (HITL) |

Cấu hình gate sẵn có hướng `gate.stp_when` — product YAML quyết định nhánh, không `if product == …` trong graph.

Quyết định: `approve` / `reject` / `needs_more_info` (loop về tiếp nhận hoặc chỉnh phương án).

**Sau approve:** mới lập hợp đồng / cam kết giải ngân (nếu sản phẩm yêu cầu).

---

## 5. Giải ngân

**Với tín chấp vay tiêu dùng (sản phẩm neo của confirm này):**  
→ **auto duyệt giải ngân** sau khi đã phê duyệt (không thêm HITL giải ngân trừ khi config tắt).

**Chốt tối thiểu trước khi book (khuyến nghị, kể cả auto):**

- Đã có quyết định approve
- *(Production / mở rộng: re-check CIC; window 3–6 tháng kể từ duyệt; chứng từ mục đích nếu policy yêu cầu)*

**Output:** giải ngân / khế ước nhận nợ.  
Hậu giải ngân (giám sát nợ, phân loại nợ…) — ngoài scope demo, ghi nhận gap.

---

## Mapping sang hệ thống hiện tại (ngắn)

| Stage | Trong code / dịch vụ (đã có hoặc kế hoạch) |
|-------|---------------------------------------------|
| 1 Tiếp nhận | Seed dossier / application-svc; `cic_consent`; checklist |
| 2 RM đề xuất | `cic_lookup` + `price_loan` (kế hoạch) + `compute_dti` + UI chỉnh input |
| 3 Thẩm định | Credit / Ops / Compliance graph + policy veto |
| 4 Phê duyệt | `gate.stp_when` + `/approvals` HITL |
| 5 Giải ngân | `disbursement.auto` (tín chấp tiêu dùng = on) |

Số liệu (DTI, LS, CIC) **không** do LLM bịa — tool / policy; LLM chỉ prose.

---

## Những điểm đã chốt với team (2026-07-18)

1. Tách rõ **RM đề xuất** (lập phương án) và **Thẩm định** (kiểm tra phương án) — hai stage riêng.
2. Agent ở stage 2: CIC + DTI + phương án + LS từ CIC + kỳ hạn + risk; **user chỉnh được**.
3. Stage 3 đầu vào = phương án agent; focus hợp lý / legal / khả năng trả nợ.
4. Stage 4: Agent STP khi hồ sơ đẹp & đơn giản; người khi rủi ro.
5. Stage 5 tín chấp tiêu dùng: **auto giải ngân** sau duyệt.

---

## Ngoài confirm này (không chặn demo)

- KYC/eKYC đầy đủ, AML đầu vào, ma trận thẩm quyền hạn mức, multi-tranche, hậu giải ngân — xem gap trong [`FLOW-BUSINESS-REVIEW.md`](./FLOW-BUSINESS-REVIEW.md).
- Sửa kỹ thuật ưu tiên nếu đụng production: DTI phải gồm nợ CIC; chặn nhóm nợ xấu; AML đúng stage tiếp nhận.
