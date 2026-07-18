# Handoff — Demo datasets synced from application DB

- **Date:** 2026-07-19
- **Author:** agent (Cursor)
- **Branch / PR:** local WIP
- **Status:** ✅ Done

## What changed & why

7 hồ sơ trong `application` DB (happy / veto / hitl + 4 CCCD) giờ khớp KYC / CIC / eKYC / geo theo `customer_id` + CCCD thật. Fallback `cic_lookup` đọc `cic_records.json` (không còn stub group-1 giả). Số tiền demo chỉnh để SOP tách nhánh rõ: happy→STP, veto→purpose block, hitl→manual review.

## Files touched

- `services/cic-svc/scripts/sync_cic_from_application_db.py` — sync seed từ DB
- `services/application-svc/scripts/patch_demo_amounts.py` — patch amount demo trên DB
- `services/cic-svc/seed/cic_records.json` — 7 CCCD demo + mortgage `001099000003` sạch
- `packages/shared/aulacys/agents/resources/compliance/{kyc_records,ekyc_face_match,customer_geo}.json`
- `packages/shared/aulacys/agents/tools/cic.py` — fallback load seed file
- `packages/shared/aulacys/agents/graph.py` + `application-svc/seed/dossiers.py` — amount/debt demo
- `packages/shared/aulacys/policy/profiles.py` + `retail_lending.yaml` (shared + policy-svc) — purpose trên unsecured, `verified: true`
- `packages/shared/aulacys/agents/application_client.py` — map `dob` + `personal_expense`
- tests + golden compliance

## How to run / verify

```bash
# Re-sync từ DB (cần DIRECT_URL trong application-svc/.env)
apps/api/.venv/Scripts/python.exe services/application-svc/scripts/patch_demo_amounts.py
apps/api/.venv/Scripts/python.exe services/cic-svc/scripts/sync_cic_from_application_db.py

# Smoke 3 nhánh
$env:PYTHONPATH="packages/shared"
python -c "import asyncio; from aulacys.agents.graph import agent
async def m():
  for q in ['hello','veto','hitl']:
    r=await agent.ainvoke({'query':q}); print(q, r['outcome'], r['compliance'].veto)
asyncio.run(m())"
# expect: stp_approved / vetoed / ready_for_human_approval

cd packages/shared && python -m pytest tests/test_agents/test_cic_tool.py tests/test_agents/test_graph.py tests/test_policy -q
cd services/orchestrator-svc && python -m pytest tests/test_api/test_routes.py tests/test_api/test_rule_engineer.py -q
```

## Contract impact

none (`schemas.py` / `api.ts` không đổi)

## Follow-ups / TODO

- [ ] Restart `cic-svc` nếu đang chạy để reload seed
- [ ] UI assess-dashboard: trỏ đúng 3 application_id demo từ DB
- [ ] Re-seed dossiers nếu DB bị reset (`seed_dossiers` rồi chạy lại 2 script trên)

## Gotchas

- Identity lấy từ DB; **amount** veto/hitl chỉnh vì SOP (≤12× thu nhập, DTI band) — không giữ 300tr/200tr cũ.
- `prohibited_purpose` giờ **blocking + verified** trên profile unsecured (wow veto).
- HITL = CIC nhóm 2 (không PEP, không DTI block).
- Không có `CIC_SVC_URL` vẫn OK: tool đọc `services/cic-svc/seed/cic_records.json`.
