# Business (nghiệp vụ) review — FLOW-PROCESS-LOAN.md

> Đánh giá quy trình trong [`FLOW-PROCESS-LOAN.md`](./FLOW-PROCESS-LOAN.md) theo **góc nghiệp vụ
> cho vay bán lẻ**, đối chiếu năng lực hiện có của dự án (`apps/api`, `services/`). Trọng tâm:
> đúng trình tự, đủ chốt kiểm soát, tuân quy định. **Không** đánh giá theo tiêu chí demo.
>
> **Anchor sản phẩm:** flow doc mô tả **vay tín chấp lương** (Đơn đề nghị vay tín chấp, bảng
> lương ≥3 tháng, HĐLĐ) → review lấy tín chấp làm chính; §7 nêu delta cho **thế chấp**.
>
> **Lưu ý pháp lý:** mọi trích dẫn quy định (TT39/2016, TT02/2013 + TT31/2024, NĐ13/2023) là
> **chỉ dấu nghiệp vụ, chưa verify điều luật** — giữ đúng thái độ thận trọng như
> `policy/rules/*.yaml` (`verified: false`). Đối chiếu văn bản gốc trước khi trích ra ngoài.

---

## 0. Meta — flow doc là *draft*, chưa phải SOP

Đánh số lộn xộn (1343–1347, 2290–2296 = rác copy), ghi chú rời ("k có AI", "để động k fix").
Nhiều chốt nghiệp vụ **bị bỏ trống**, không phải cố ý loại. Review coi nó là SOP cần hoàn thiện.

---

## 1. Lỗi trình tự nghiệp vụ (SAI, không chỉ thiếu)

### 1.1 Gen hợp đồng đặt ở Thẩm định — ngược quy trình

Hợp đồng tín dụng chỉ lập/ký **SAU phê duyệt**. Thẩm định (chưa duyệt) chỉ ra **đề xuất cấp
tín dụng** (điều khoản đề xuất), không phải hợp đồng. Flow đặt "gen hợp đồng" ở stage 2 trước
phê duyệt stage 3 → ký cam kết trước khi có thẩm quyền duyệt = rủi ro pháp lý.
**Sửa:** stage 2 xuất *term sheet / đề xuất*; hợp đồng dời sang **sau** stage 3.

### 1.2 Chuỗi DTI ↔ lãi suất bị đảo

Flow: tính DTI (2292) *trước* → chấm điểm→lãi suất (2295) *sau*. Nhưng DTI cần nghĩa vụ trả
nợ tháng = **phụ thuộc lãi suất**, mà lãi suất phụ thuộc scoring. Đúng nghiệp vụ:

```
score → pricing sơ bộ → khoản trả tháng (gồm khoản mới) → DTI → đủ điều kiện
```

Dự án (`nodes/credit.py`: annual_debt_service → compute_dti) xử **đúng hơn** flow doc.

### 1.3 DTI dùng nợ khai báo, không dùng nợ CIC

Nghiệp vụ: mẫu số/ tử số DTI phải gồm **toàn bộ dư nợ hiện hữu từ CIC** + khoản mới.
Flow chỉ ghi "tính DTI" mơ hồ. **Dự án cũng dính:** `credit_fallback` cộng
`existing_monthly_debt` (declared) + proposed, **không** quy `total_outstanding_vnd` từ CIC ra
nghĩa vụ tháng → bỏ sót nợ khách giấu. → lỗ hổng nghiệp vụ có thật trong code
([`credit.py`](../apps/api/src/agents/nodes/credit.py)).

---

## 2. Thiếu chốt kiểm soát — theo stage

### Stage 1 — Tiếp nhận

| Thiếu                                                                                       | Nghiệp vụ                            | Dự án                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| **KYC/eKYC** (xác minh CCCD, C06/BCA)                                                 | định danh khách trước khi xử lý | ❌                                                                       |
| **Sàng lọc AML/PEP/cấm vận NGAY đầu vào**                                       | không nhận hồ sơ khách bị cấm   | ⚠️ có`aml_screen` nhưng **đặt ở stage 2** — sai vị trí |
| **Đồng ý tra CIC (consent)**                                                        | bắt buộc pháp lý                   | ✅ dự án đã có (`cic_consent`+403) — đúng hơn flow            |
| **Chống giả mạo bảng lương** (đối chiếu TK nhận lương, xác minh employer) | phòng gian lận thu nhập             | ❌ (chỉ`income_verify` declared vs statement)                         |

### Stage 2 — Thẩm định

| Thiếu                                                                                           | Nghiệp vụ                     | Dự án                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------- |
| **Ngưỡng reject theo nhóm nợ CIC** (nhóm ≥3 = nợ xấu → auto từ chối, TT02/TT31) | chặn nợ xấu                  | ⚠️ có`cic_group`/`has_bad_debt`, logic ra "manual_review" mờ |
| **Sàn/trần lãi suất** (≥ cost of funds; ≤ trần quy định)                          | không cho vay dưới giá vốn | ❌                                                                   |
| **Đánh giá nguồn trả nợ + phương án vốn** (TT39)                                 | cốt lõi thẩm định          | ⚠️ "recommendation" đơn                                          |
| **Hạn mức sản phẩm** (min/max, max term, max DTI)                                      | khẩu vị sản phẩm            | ✅ product YAML                                                      |

### Stage 3 — Phê duyệt

| Thiếu                                                                 | Nghiệp vụ          | Dự án                    |
| ---------------------------------------------------------------------- | -------------------- | -------------------------- |
| **Ma trận thẩm quyền theo hạn mức** (nhỏ→CV, lớn→HĐTD) | phân cấp duyệt    | ❌ (chỉ "approver" chung) |
| **Separation of duties** (thẩm định ≠ phê duyệt)           | quy định           | ✅ nêu trong SECURITY.md  |
| **Đường quay lại khi "yêu cầu bổ sung"**                  | loop về tiếp nhận | ❌                         |
| Dynamic HITL theo khẩu vị ("để động, k fix")                     | đúng nghiệp vụ   | ✅`gate.stp_when`        |

### Stage 4 — Giải ngân

| Thiếu                                                                                                                              | Nghiệp vụ                 | Dự án                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
| **Điều kiện tiên quyết** (ký HĐ, đóng phí, chứng từ mục đích)                                                  | conditions precedent        | ❌                                  |
| **Kiểm soát mục đích sử dụng vốn** (giải ngân đúng mục đích, có chứng từ; multi-tranche từng lần) — TT39 | chống dùng vốn sai       | ❌                                  |
| **Re-check CIC** + nhánh CIC xấu đi → dừng, tái thẩm định                                                            | kiểm soát theo thời gian | ❌ (flow có ý, chưa đủ nhánh) |
| Window 3–6 tháng, multi-tranche                                                                                                   | quy tắc sản phẩm         | ❌                                  |

---

## 3. Gap toàn vòng đời (flow kết thúc ở giải ngân)

- **Hậu giải ngân thiếu hẳn:** giám sát nợ, phân loại nợ định kỳ (TT02/TT31), nhắc/thu hồi, xử
  lý quá hạn. Vòng đời khoản vay không dừng ở giải ngân. (Có thể ngoài scope hackathon — vẫn là
  gap nghiệp vụ lớn.)
- **Exposure tổng 1 khách / chống trùng hồ sơ** — dự án có `compute_exposure_ratio`+
  `related_party`; flow không nêu.

---

## 4. Ba gap nghiêm trọng nhất (vừa sai nghiệp vụ, vừa sửa nhanh)

1. **DTI bỏ sót nợ CIC** → sai bản chất đánh giá khả năng trả nợ.
   *Fix:* quy `total_outstanding_vnd` (hoặc nghĩa vụ tháng) từ CIC vào tử số DTI trong
   `credit_fallback`. Rẻ, đúng luật, sửa lỗi thật.
2. **Không chặn theo nhóm nợ CIC** → nợ xấu lọt qua.
   *Fix:* thêm policy rule `metric: cic_group, operator: "<=", threshold: 2, severity: blocking`
   trong `policy/rules/retail_lending.yaml`; credit emit `cic_group` vào metrics.
3. **AML/KYC sai vị trí (stage 2 thay vì tiếp nhận)** → nhận hồ sơ khách cấm vận.
   *Fix:* chạy `aml_screen` ở intake gate; hồ sơ match → dừng trước thẩm định.

→ Ba cái này **đúng hướng production** hơn là thêm pricing/contract, vì sửa *đúng-sai nghiệp vụ*,
không phải thêm bề mặt.

---

## 5. SOP đã sửa (đúng trình tự + đủ chốt) — tín chấp lương

```
STAGE 1 — TIẾP NHẬN
  1. Thu hồ sơ (Đơn, CCCD, sao kê lương ≥3 tháng, HĐLĐ)

  4. Lấy đồng ý tra CIC (consent)                         [cic_consent gate]
  5. Trích xuất + đối chiếu khớp (declared vs chứng từ)   [accuracy_check]
  6. Kiểm tra đủ hồ sơ - lập tờ trình                                   [doc_checklist]
  → thiếu/không khớp ⇒ yêu cầu bổ sung (loop lại)
  OUT: tờ trình tính dụng
  

STAGE 2 — THẨM ĐỊNH
   - lấy thông tin
  7. Tra CIC, tính DTI =>  Đủ điều kiện? (DTI≤cap, nguồn trả nợ, phương án vốn) → decision {approve/reject/refer}                  [cic_lookup + scorecard]
  
 10. Định lãi suất = base + f(hạng, kỳ hạn, risk premium),
     ràng buộc floor (≥ giá vốn) / cap (trần)  - Cân đối PNL profit and lost            [price_loan]
 
 
 
   
 15. Lập TỜ TRÌNH TÍN DỤNG (số từ tool; nhận định = prose)  [credit_memo]
  OUT: Tờ trình (KHÔNG phải hợp đồng)

STAGE 3 — PHÊ DUYỆT (người, dynamic theo khẩu vị)
 16. Chọn cấp duyệt theo hạn mức (authority matrix)
 17. Người duyệt (≠ người thẩm định) xem tờ trình + kết quả
 18. approve / reject / yêu-cầu-bổ-sung(→loop stage 1)     [/approvals: thêm needs_more_info]
 19. Nếu approve ⇒ LẬP HỢP ĐỒNG Tín dụng                            [gen_contract — SAU duyệt]

STAGE 4 — GIẢI NGÂN
 20. Điều kiện tiên quyết: ký HĐ, phí, chứng từ mục đích
 21. RE-CHECK CIC (có thể xấu đi từ lúc duyệt)             [cic_lookup lại]
     → xấu đi ⇒ DỪNG, tái thẩm định
 22. Kiểm tra window 3–6 tháng kể từ duyệt
 23. Giải ngân (1 hoặc nhiều lần), mỗi lần đúng mục đích + chứng từ  [book_disbursement]
     → auto nếu gate cho phép, else qua duyệt              [config disbursement.auto]
OUT: Khế ước nhận nợ

(HẬU GIẢI NGÂN — ngoài scope demo, ghi nhận gap)
 24. Giám sát nợ, phân loại nợ định kỳ, nhắc/thu hồi
```

Mọi bước ghi vết audit (dự án có ledger append-only ✅).

---

## 6. Đối chiếu năng lực dự án (tổng)

| Nghiệp vụ                               | Trạng thái dự án           |
| ----------------------------------------- | ------------------------------ |
| CIC + scorecard + consent                 | ✅ (đúng hơn flow)          |
| DTI / khoản trả                         | ⚠️ có,**bỏ nợ CIC** |
| AML / related party                       | ⚠️ có,**sai stage**   |
| Veto policy-as-code + exposure            | ✅                             |
| Phê duyệt (endpoint)                    | ✅ thiếu authority matrix     |
| Hạn mức sản phẩm (config)             | ✅                             |
| KYC/eKYC                                  | ❌                             |
| Định lãi suất (pricing/floor/cap)     | ❌                             |
| Ngưỡng reject theo nhóm nợ CIC        | ❌                             |
| Tờ trình tín dụng                     | ❌                             |
| Hợp đồng (sau duyệt)                  | ❌                             |
| Giải ngân + re-check + window + tranche | ❌                             |
| Hậu giải ngân                          | ❌                             |

---

## 7. Delta cho sản phẩm THẾ CHẤP (nếu chuyển product)

Thêm/khác so với tín chấp:

- **Định giá TSBĐ** (`property_valuation`) + **thẩm tra pháp lý sổ đỏ** (`land_registry`:
  tranh chấp, quy hoạch) — dự án có ✅.
- **LTV** = khoản vay / giá trị TSBĐ, veto nếu vượt `limits.ltv_cap` — dự án có ✅.
- **Kiểm soát mục đích** chặt hơn (mua nhà để ở vs tất toán TCTD khác = mục đích cấm) — dự án có
  nhánh `prohibited_purpose_refinance_other_bank` ✅.
- **Đăng ký giao dịch bảo đảm** là điều kiện tiên quyết giải ngân — thiếu.
- Kỳ hạn dài (240 tháng), giải ngân theo tiến độ — quy tắc sản phẩm khác.

→ Cơ chế veto **giống nhau**, chỉ khác *metric* (tín chấp veto trên DTI/nhóm nợ/AML; thế chấp
thêm LTV/mục đích). Không cần code riêng — khác ở product YAML + policy.

---

## 8. Kết luận

Flow doc **đúng khung 4 stage** nhưng: (a) sai 2 trình tự (hợp đồng, DTI↔lãi suất), (b) thiếu
KYC/AML-đầu-vào, ngưỡng nợ CIC, floor/cap lãi, điều kiện giải ngân, hậu-giải-ngân. Dự án **đã
đúng vài chỗ flow bỏ sót** (consent, chuỗi DTI, exposure) nhưng **còn 3 lỗi nghiệp vụ sửa
nhanh** (DTI bỏ nợ CIC, không chặn nhóm nợ, AML sai stage — §4). Ưu tiên sửa §4 trước khi mở
rộng tính năng.
