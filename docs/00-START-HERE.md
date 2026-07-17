# 00 — START HERE

**SHB · Digital Expert Agents · Hack CX Together 2026**
**Đọc hết trang này trước khi làm bất cứ việc gì. 5 phút.**
Phiên bản 1.0 — 2026-07-17 · Trạng thái: draft, cần team phản biện

---

## Đọc theo thứ tự

| # | File | Khi nào |
|---|---|---|
| 1 | **Trang này** | Ngay bây giờ. Là kết luận, không phải giới thiệu |
| 2 | [`reference/problem-statement.txt`](./reference/problem-statement.txt) | Đề bài nguyên văn. **Nguồn duy nhất** cho mọi câu trích đề |
| 3 | [`../AGENTS.md`](../AGENTS.md) §0–§1 | Trước dòng code đầu tiên |
| 4 | [`SHB-Digital-Expert-Agents-Solution-Design.md`](./SHB-Digital-Expert-Agents-Solution-Design.md) | Khi cần chi tiết. 1100+ dòng, không đọc một lần |

---

## 📌 Kịch bản đã chốt — 2026-07-17

> **"Công ty ABC đề nghị vay 20 tỷ đồng, thế chấp bất động sản, yêu cầu giải ngân trong 5 ngày."**
>
> Credit đề xuất → **Compliance phủ quyết vì vượt trần cấp tín dụng** → Planner lập lại kế hoạch → Critic kiểm chứng → **người phê duyệt** → ghi ticket thật.

**Đừng mở lại tranh luận này.** Đã chấm 5 ứng viên theo 6 tiêu chí; log ở [`TEAM_RULES.md`](./TEAM_RULES.md) → *Decisions*.

**Hiểu đúng cách chọn:** đề đã chọn *lĩnh vực* thay mình — *"credit, legal and compliance, products, or operations"*. Mình không chọn lĩnh vực. Mình chọn **kịch bản bắt các lĩnh vực đó đâm vào nhau**. Đó là lý do A thắng: nó là kịch bản duy nhất có xung đột **vừa đủ mạnh vừa kể được trong 5 phút**.

| Ứng viên | Vì sao trượt |
|---|---|
| B. Kiểm chứng từ LC | Tri thức gọn nhất (UCP600 chỉ 39 điều), hợp AI nhất — nhưng **một phòng làm hết, không có xung đột**. → Để làm **quy trình #2** chứng minh mở rộng (§3.3) |
| C. Onboarding / KYC DN | Xung đột mỏng hơn (kinh doanh muốn khách vs Compliance nghi ngờ) |
| D. Triển khai thông tư mới | Xung đột đẹp nhất về trí tuệ, nhưng **trừu tượng** — không dựng được cảnh trên sân khấu |
| E. Tái cơ cấu nợ / NPL | Xung đột tốt nhưng quá phức tạp cho 5 phút, và không có nguồn số liệu |

**Nhánh veto → replan là bức tường chịu lực.** Không có nó thì ba agent chạy song song rồi gộp = một agent nhiều bước, và giám khảo sẽ nói đúng câu đó. Bảo vệ nhánh đó trên hết.

---

## Bài toán — một câu

> Ngân hàng đã số hoá mọi chỗ khách hàng chạm vào, và chưa số hoá chỗ nào chuyên gia suy nghĩ. Nên lead time không nằm ở thao tác — nó nằm ở **hàng đợi giữa các phòng ban** và **vòng làm lại** khi phát hiện vi phạm quá muộn.

**Không được pitch:** "ngân hàng chậm vì thủ công". Sai, và SHB biết là sai — họ đã công bố **>95% quy trình số hoá, >98% giao dịch qua kênh số**.

Bằng chứng cho quy luật, hai quy trình độc lập cùng một hình dạng:

| Quy trình | Cửa trước (khách chạm) | Buồng trong (chuyên gia nghĩ) |
|---|---|---|
| Tín dụng doanh nghiệp | ✅ Đề nghị giải ngân online, ký số, sinh trắc học | ❌ Thẩm định, pháp chế, HĐTD |
| Trade finance / LC | ✅ Đăng ký phát hành LC, tra cứu online | ❌ Kiểm chứng từ |

Chi tiết: Solution Design §2.4.1

---

## Value — một câu

> **Lấy lại 50% thời gian chuyên gia đang bị chôn vào việc soạn thảo, mà không nới một ràng buộc tuân thủ nào.**

**Hai vế, và vế sau mới là chỗ bán được.** AI nào cũng làm được vế đầu. Vế sau là lý do một ngân hàng dám triển khai.

Đây là Benefit #3 của chính đề: *"Reduces dependence on individual experts **while preserving domain-specific workflows and controls**."*

> Chỉ pitch vế đầu = pitch cho phòng IT.
> Pitch cả hai vế = pitch cho hội đồng rủi ro.

---

## Tập trung vào đâu

### Đừng tập trung vào agent

15 đội đều sẽ có 3 agent, 1 planner, RAG, chat UI. **Agent là vé vào cửa, không phải điểm.**

### Xếp theo điểm ăn được trên mỗi giờ bỏ ra

| Ưu tiên | Việc | Giờ | Đội khác có? |
|---|---|---|---|
| **1** | **Bảng eval single-agent vs multi-agent** | ~6 | **Gần như không đội nào** — hết giờ, bỏ |
| **2** | **Hành động ghi thật + cổng người phê duyệt** | ~3 | Ít. Đa số trả về text |
| **3** | **Nhánh veto → replan** | ~4 | Ít. Đa số làm fan-out |
| 4 | Dashboard trace live | ~8 | Nhiều đội có bản nào đó |
| 5 | Chất lượng RAG pháp quy | ~8+ | Khó khoe trong 5 phút |
| 6 | Tầng quy trình (process-as-config) | ~4 | Chỉ đụng nếu 1–3 xong |

**Ba cái đầu ≈ 13 giờ, phủ đúng ba thứ cả sân bỏ trống.**

### Vì sao thứ tự đó

**#1 đứng đầu** — đề ghi thẳng nó là deliverable. Phần lớn đội sẽ hết giờ và bỏ. Sáu giờ đổi một hạng mục không ai nộp: không có deal nào tốt hơn trong 48 giờ.

**#2 trên #3** — đếm số lần đề nhắc *"hành động, không phải chữ"*:

- Brief: *"execute actions… rather than only generating text responses"*
- Deliverable 3: *"perform concrete actions rather than only return text"*
- Benefit 1: *"Extends GenAI from answering questions to performing work"*
- Why matters: *"beyond traditional RAG and chatbot solutions"*

**Bốn lần.** Khi một đề nói cùng một câu bốn lần, đó là câu duy nhất nó thật sự nói.

**#3 là bức tường chịu lực** — không có nó thì #1 không có gì để đo (single agent hoà mọi chỉ số), và Benefit #2 (*"multiple specialist departments… cross-functional requests"*) không chứng minh được. Ba agent chạy song song rồi gộp = một agent nhiều bước, và giám khảo sẽ nói đúng câu đó.

---

## Không làm

| ❌ | Vì sao |
|---|---|
| Chatbot / cá nhân hoá trải nghiệm | SHB có AI Chatbot rồi. Future Banker 2025 đã có đội thắng hướng này |
| "Số hoá quy trình" | Giải xong trước khi mình tới. Bỏ chữ này khỏi mọi slide |
| Đấu Big Data / ML | Họ có đội làm dự báo và cá nhân hoá. Không hơn được, không cần |
| **Trích SHBFinance** ("duyệt tự động 5 phút") | Công ty SHB **đã bán 50% cho Krungsri (5/2023), nghị quyết bán nốt 11/2025**. Và là scorecard tiêu dùng — khác bài |
| Build sâu quy trình #2 trước giờ 36 | Đề nói *"foundation for **future** process automation"* — họ đòi nền móng, không đòi hai quy trình |
| Thêm agent thứ tư, thứ năm | Thêm agent chứng minh code chạy. Thêm **quy trình** mới chứng minh kiến trúc đúng |

---

## Framework đánh giá chất lượng

Bảy chiều, đo được, không cảm tính:

| Chiều | Đo thế nào | Ngưỡng |
|---|---|---|
| **Correctness** | Kết luận khớp ground truth | ≥80% nhóm xuyên domain |
| **Groundedness** | Mọi số truy về `tool_call_id`, mọi luận điểm về điều khoản | **100%** — không thương lượng |
| **Compliance recall** | Bắt vi phạm trong 5 case bẫy | **5/5** — chỉ số ngân hàng quan tâm nhất |
| **Determinism** | Cùng input → cùng kết luận trên ràng buộc cứng | 100% — vì nó là Python, không phải LLM |
| **Latency / cost** | p50, p95, USD/request | p50 < 60s |
| **Auditability** | Dựng lại được vì sao ra quyết định đó | Xuất JSON đầy đủ |
| **Graceful failure** | Thiếu dữ liệu → nói "chưa đo", không đoán | `evaluate({})` → `[]`, không → "đạt" |

**Chiều 7 hay bị bỏ và là chiều ngân hàng test đầu tiên.** Hệ nói "tôi không biết" đáng tin hơn hệ luôn có câu trả lời.

---

## Framework rủi ro — nói bằng ngôn ngữ của họ

Đừng gọi là "risk của AI". Ngân hàng có khung sẵn. Map vào:

| Loại rủi ro | Biểu hiện | Kiểm soát |
|---|---|---|
| **Model risk** | LLM bịa số, bịa điều khoản | Ranh giới tất định (§7.1) + `Critic` reject (§7.3) |
| **Compliance risk** | Dùng sai ngưỡng luật định | Policy-as-code có `effective_from` + `verified` (§7.2) |
| **Operational risk** | Agent thực hiện hành động sai | Cổng người duyệt + least privilege trên tool và KB |
| **Third-party risk** | Phụ thuộc API LLM ngoài | Fallback, cache, `max_steps` |
| **Reputational risk** | Sai trước mặt khách | Agent **không có quyền phê duyệt**, chỉ đề xuất |

### Đòn mạnh nhất: map vào Three Lines of Defense

| Tuyến | Ai trong hệ này |
|---|---|
| **Tuyến 1** — kinh doanh | `Credit agent` đề xuất, RM review |
| **Tuyến 2** — rủi ro & tuân thủ | `Compliance agent` + policy-as-code, **có quyền veto tuyến 1** |
| **Tuyến 3** — kiểm toán nội bộ | Audit log bất biến + trace đầy đủ |

**Kiến trúc multi-agent không phải lựa chọn kỹ thuật — nó là mô hình tổ chức của chính ngân hàng, viết thành code.**

Đó là câu trả lời sâu nhất cho *"sao không dùng một agent?"*:

> *Vì một agent không có tuyến hai. Không ngân hàng nào vận hành như vậy, và không cơ quan quản lý nào cho phép.*

---

## Câu chốt pitch

> *"Chúng tôi không xây một chatbot biết nhiều hơn. Chúng tôi xây tuyến phòng thủ thứ hai của các anh thành code — và nó chặn tuyến một ngay ở phút thứ hai, thay vì ngày thứ mười."*

---

## Cờ đỏ đang treo — ai đó phải gỡ

| # | Việc | Ai | Hạn |
|---|---|---|---|
| 1 | **Tra trần cấp tín dụng** Luật các TCTD 2024 Điều 136. `policy/rules/credit_limits.yaml` đang để `0.15` với `verified: false` — **đó là số của luật CŨ**. Luật 2024 thay bằng lộ trình giảm theo năm. **Không hỏi LLM. Mở luật.** | Chủ sở hữu compliance | Trước ngày thi |
| 2 | Hỏi BTC câu đầy đủ của **Deliverable #5** — bị cụt trong PDF gốc ở `"…between a single-agent chatbot"` | PM | Trước ngày thi |
| 3 | Hỏi BTC có **rubric chấm** không. Có rubric thì rubric thắng mọi suy luận trong doc này | PM | Trước ngày thi |
| 4 | **Chốt stack**: `AGENTS.md` §3 khoá `gpt-4o-mini`; Solution Design đề Opus/Haiku. `gpt-4o-mini` làm Planner là yếu — nó phải phân rã DAG và nuốt veto. §1 luật 2: đổi stack = quyết định team | Cả team | Giờ 0 |
| 5 | Log `pyyaml` vào `TEAM_RULES.md` → *Decisions* | Chủ sở hữu backend | Giờ 0 |

---

## Ba số được phép mang lên slide

| Số | Nguồn | Dùng ở đâu |
|---|---|---|
| **KYC review 95 ngày (2023), tăng từ 84 ngày (2022)** | Khảo sát ngành (vendor) | Mở bài. Giá trị không ở độ lớn mà ở **hướng** — cả ngành đổ tiền tự động hoá KYC 10 năm, nó vẫn chậm thêm |
| **RM mất 50–60% thời gian cho việc hành chính** | Khảo sát ngành (vendor) | Bằng chứng ngoài đội cho luận điểm trung tâm. Và trả lời "AI thay người à?" |
| **~70% bộ chứng từ LC bị từ chối lần xuất trình đầu** | ICC / ngành | Phần mở rộng quy trình #2 |

**Cách nói đúng:** *"Khảo sát toàn cầu cho thấy…"*
**Cách nói sai:** *"SHB đang mất 95 ngày."* — **không nguồn nào đo ngân hàng Việt Nam.** Xem Solution Design Phụ lục F.

Số KPI trong Solution Design §4.4 (14–21 ngày → 3–5 ngày) là **giả định của đội**. Gắn nhãn đó trên slide. Giám khảo là người trong ngành — họ nhận ra số bịa ngay, và một "chúng tôi chưa đo" thành thật làm tăng độ tin, không giảm.
