# Handoff — Rule Engineer complete slice

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** local WIP
- **Status:** ✅ Done (MVP hoàn chỉnh cho demo)

## What changed & why

Rule Engineer đủ bộ rule thẩm định bán lẻ + gắn theo **mã sản phẩm**, Compliance emit đủ metrics (CIC, docs, tenor, income, land). Khẩu vị chỉnh được theo `product_code`; có `change_log` nhẹ trong `appetite_overrides.yaml`. Hardening bổ sung: profile fail-closed khi thiếu metric, legal rule chưa verify không auto-veto, threshold có domain validation và file override được ghi atomic.

Metric layer đã được chuẩn hóa bằng registry + collector: mỗi metric có nhãn, kiểu, miền giá trị, stage, source và timestamp; Compliance trả `metric_report` gồm completeness, missing/invalid và provenance. Dashboard hiển thị report này trực tiếp. DTI dùng `max(nghĩa vụ tháng khách khai, nghĩa vụ tháng CIC)`; nếu CIC có dư nợ nhưng không trả nghĩa vụ tháng thì không đoán DTI và fail-closed.

## Rules theo gói

**SECURED:** mục đích cấm · LTV · sổ đỏ · DTI · CIC · nợ xấu · đủ CT · kỳ hạn · thu nhập · AML · PEP

**UNSECURED:** trần tiền · DTI · CIC · nợ xấu · đủ CT · kỳ hạn · thu nhập · AML · PEP

Editable trên UI: `max_retail_dti`, `max_cic_group` (và appetite numeric khác nếu thêm).

## Files touched (bổ sung)

- `apps/api/src/policy/rules/retail_lending.yaml` — rule mới
- `apps/api/src/policy/profiles.py` — profile sets + labels VI
- `apps/api/src/policy/loader.py` — product overrides + change_log
- `apps/api/src/policy/metrics.py` — registry, validation, provenance và completeness report
- `apps/api/src/agents/nodes/credit.py` — DTI bao gồm nghĩa vụ tháng CIC, không quy đổi dư nợ bằng giả định
- `apps/api/src/agents/nodes/compliance.py` — emit metrics; CIC tool result được tính là chứng cứ CIC khi kiểm checklist
- `services/cic-svc/app/schemas/cic.py` + `services/cic-svc/app/services/cic.py` — optional `monthly_debt_obligation_vnd`
- `apps/web/components/admin/assess-dashboard.tsx` — bảng Chỉ số thẩm định
- `apps/api/src/api/routes.py` + `schemas.py` — `product_code`
- `apps/web` — form truyền `productCode`; API client
- `tests/test_policy/test_rule_engineer.py` — 26 tests

## How to run / verify

```bash
# API healthy (khuyến nghị :8001 nếu :8000 treo)
cd apps/api && .venv/Scripts/uvicorn.exe src.main:app --reload --host 127.0.0.1 --port 8001
cd apps/web && npm run dev   # .env.local → NEXT_PUBLIC_API_URL=8001

# Tests
cd apps/api && .venv/Scripts/pytest.exe tests/test_policy/ -q
# Full API suite → 116 passed

cd ../../services/policy-svc
../../apps/api/.venv/Scripts/python.exe -m pytest tests -q
# → 6 passed

cd ../../apps/web
npm.cmd run lint && npm.cmd run build
# → green; chỉ còn cảnh báo next/no-img-element có sẵn

cd ../../services/cic-svc
../../apps/api/.venv/Scripts/python.exe -m pytest tests -q
# → 9 passed

# UI
# /admin/san-pham/ca-nhan → Sửa SP → mục 7: nhiều rule hơn + mã SP
# Chỉnh DTI hoặc CIC → Lưu → Thử rule demo
```

## Contract impact

`product_code` optional trên `GET/PATCH/POST /policy/rules*` — đã sync `api.ts`. `PolicyViolation.actual` giờ có thể là `null` và có `missing_metric=true` khi thiếu chỉ số; TypeScript đã mirror.

`ComplianceVerdict.tool_results.metric_report` là payload mới tương thích ngược vì `tool_results` vốn là object mở. Không đổi response schema top-level.

## Follow-ups

- [ ] Kill stale :8000, chạy một API duy nhất
- [ ] Persist overrides DB + RBAC `policy.write_appetite` (không dùng API key public ở frontend)
- [ ] Mirror profile/product override API vào `policy-svc`; hiện profile-scoped evaluate vẫn chạy local trong API
- [ ] Compliance owner xác minh căn cứ rule mục đích vay; trước khi verify, rule này chỉ cảnh báo/HITL
- [ ] Report tờ trình sau assess (bảng rule pass/fail)

## Gotchas

- Boolean rules (docs/LTV/ceiling) không chỉnh threshold trên UI — chỉnh limits gói.
- Override theo `product_code` chỉ áp khi form có mã SP (tạo mới: điền mã trước khi Lưu rule).
- `load_rules` LRU — đổi YAML cần reload uvicorn.
- Missing metric trong profile là blocking dù rule gốc là warning; đây là fail-closed có chủ đích.
- Chỉ **legal rule** chưa verify bị hạ xuống warning. Appetite rule theo cấu hình gói vẫn thực thi blocking.
- Không suy `monthly_debt_obligation_vnd` từ `total_outstanding_vnd`; thiếu lịch trả nợ/lãi suất thì phép quy đổi sẽ là số bịa.
