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
- **Ngưỡng tham chiếu chung (thị trường):** &lt;36% lý tưởng · 37–42% cân nhắc · ≥43% rủi ro  
  → Với **tín chấp cá nhân**, dùng **cap theo band thu nhập** ở §3.C.2 (ưu tiên hơn bảng generic này).
- **Ngưỡng chặn thật** encode trong `policy/` / product YAML — không hard-code trong prompt.

### Output stage 2

**Phương án cho vay (editable):** số tiền, kỳ hạn, lãi suất đề xuất (+ breakdown), DTI, CIC
tóm tắt, risk premium — sẵn sàng làm **input stage 3**.

---

## 3. Thẩm định

**Đầu vào:** phương án cho vay từ stage 2 (không tự bịa số mới ngoài tool).

**Ba trụ thẩm định (tín chấp cá nhân):**

1. **Pháp lý & nhân khẩu** — tuổi, eKYC Face Match, khoảng cách địa lý.
2. **Phương án vay** — hạn mức vs thu nhập, kỳ hạn khớp mục đích.
3. **Khả năng trả nợ** — thu nhập tối thiểu theo vùng, DTI theo phân khúc, disposable income buffer.

Chi tiết tiêu chí: mục **3.A–3.C** bên dưới.  
Số ngưỡng **không** nằm trong prompt LLM — encode trong `policy/` / product YAML khi wire production; demo dùng tool + policy hiện có.

**Output:** kết luận thẩm định + tờ trình tín dụng (số từ tool; nhận định = prose).  
**Không** lập hợp đồng tín dụng ở stage này — hợp đồng chỉ sau khi **đã phê duyệt** (stage 4).

### 3.A Thẩm định pháp lý & nhân khẩu

| Tiêu chí | Điều kiện |
|----------|-----------|
| **Độ tuổi** | Từ **22 tuổi** đến **không quá 60 tuổi** *tại thời điểm đáo hạn* khoản vay |
| **Điểm tin cậy eKYC (Face Match Score)** | ≥ **85%** (selfie so với ảnh CCCD) |
| **Khoảng cách địa lý** | Sinh sống / làm việc trong bán kính **30–50 km** từ CN/PGD gần nhất |

*Demo:* eKYC / geo có thể mock hoặc ngoài slice OCR (`AGENTS.md` §0); vẫn ghi nhận là **điều kiện nghiệp vụ** stage thẩm định / intake.

### 3.B Thẩm định phương án vay

| Tiêu chí | Điều kiện |
|----------|-----------|
| **Hạn mức vay tối đa** | Tối đa **10–12× thu nhập ròng tháng**, và **≤ 500 triệu đồng** với phân khúc đại trà |
| **Kỳ hạn 36–60 tháng** | Nhu cầu tiêu dùng lớn (sửa nhà, mua ô tô, …) |
| **Kỳ hạn 12–24 tháng** | Mua sắm nhỏ lẻ |

Credit / Compliance đối chiếu phương án RM với hạn mức sản phẩm + các dòng trên → hợp lý / cần chỉnh / veto.

### 3.C Thẩm định khả năng trả nợ

#### 3.C.1 Thu nhập ròng tối thiểu

| Khu vực | Thu nhập ròng tối thiểu |
|---------|------------------------:|
| Tỉnh / thành **ngoài** Hà Nội & TP.HCM | **4,5 – 5 triệu** ₫/tháng |
| **Hà Nội / TP.HCM** | **7 – 8 triệu** ₫/tháng |

#### 3.C.2 Tỷ lệ DTI (Debt-to-Income)

```
DTI = (Tổng nghĩa vụ trả nợ hàng tháng / Thu nhập ròng hàng tháng) × 100%
```

- **Tử số:** nợ hiện hữu (ưu tiên CIC) + khoản trả phương án mới (sau khi đã có LS).
- **Mẫu số:** thu nhập ròng đã xác minh.

| Phân khúc thu nhập ròng | Điều kiện DTI |
|-------------------------|---------------|
| **&lt; 10 triệu** ₫/tháng | **DTI ≤ 35%** |
| **10 – 30 triệu** ₫/tháng | **DTI ≤ 45%** |
| **&gt; 30 triệu** ₫/tháng | **DTI ≤ 50–55%** |

→ Thay / bổ sung ngưỡng generic thị trường ở §2; **cap theo band thu nhập** là khẩu vị sản phẩm tín chấp cá nhân đã confirm.

#### 3.C.3 Số dư sinh hoạt phí tối thiểu (Disposable Income Buffer)

```
Thu nhập ròng − Tổng nghĩa vụ trả nợ ≥ Chi phí sinh hoạt tối thiểu
```

- Chi phí sinh hoạt tối thiểu tham chiếu: **~3–4 triệu** ₫/tháng (hoặc theo quy định nội bộ / lương cơ sở từng thời kỳ).
- Không đạt → từ chối hoặc **giảm hạn mức** (không tự tăng thu nhập).

### 3.D Mapping agent / tool (gợi ý)

| Tiêu chí | Agent / tool gần nhất |
|----------|------------------------|
| Tuổi / đáo hạn | Ops / Credit (DOB + `term_months`) |
| eKYC Face Match ≥ 85% | KYC tool (mock) / Compliance |
| Bán kính 30–50 km | Ops (geo) — có thể demo-skip |
| Hạn mức 10–12× / ≤ 500tr | Credit + `limits` product YAML |
| Kỳ hạn vs mục đích | Credit / Compliance |
| Thu nhập tối thiểu theo vùng | Credit + income verify |
| DTI theo band | `compute_dti` + policy band |
| Disposable buffer | Credit (tool số; prose = nhận định) |

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
6. **Tiêu chí thẩm định tín chấp cá nhân** (§3.A–3.C): tuổi 22–60 (tại đáo hạn), eKYC ≥85%,
   bán kính 30–50 km; hạn mức ≤10–12× thu nhập & ≤500tr; kỳ hạn 12–24 / 36–60; thu nhập tối thiểu
   theo vùng; DTI theo band; disposable buffer ≥ ~3–4tr.

---

## Ngoài confirm này (không chặn demo)

- KYC/eKYC đầy đủ, AML đầu vào, ma trận thẩm quyền hạn mức, multi-tranche, hậu giải ngân — xem gap trong [`FLOW-BUSINESS-REVIEW.md`](./FLOW-BUSINESS-REVIEW.md).
- Sửa kỹ thuật ưu tiên nếu đụng production: DTI phải gồm nợ CIC; chặn nhóm nợ xấu; AML đúng stage tiếp nhận.
