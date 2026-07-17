# Multi-agent phê duyệt khoản vay — ghi chú họp/brainstorm

## Trang 1 — Phạm vi sản phẩm & lựa chọn hướng đi

**48h — Chọn 2 loại sp**

thu hẹp use case trước sau đó mở rộng ra để áp dụng

### ① STP — Straight Through Processing

→ Agent xử lý và phê duyệt.

**Ex:**

- Vay tín chấp qua lương
- Mở thẻ tín dụng

Sử dụng data về lương, CIC, dư nợ khách hàng, hạn mức đề vay SHB, …→ Tính toán

### ② Agent research, tổng hợp, check CIC, …

- kiểm tra file → thống nhất design
- human in the loop
- Tổng hợp thông tin → **User nhìn vào dashboard để quyết định.**

### Câu hỏi:

- Muốn làm multiagent phụ trách phê duyệt. STP và human in the loop → có hợp lý không?
- Nếu chọn thì nên chọn khoản vay nào
- quy trình hiện tại như thế nào?

### Đối tượng cá nhân, cơ chế quét

Làm cho **khách hàng cá nhân**

**ACAS** — db job / cron job → quét k/h có đủ đk để vay theo rule
↓
đưa vào bảng
↓
noti cho người dùng

Tận dụng được gì của ACAS cho giải pháp => tận dụng dữ liệu hạn mức

### Cách build agent

không build agent fix cứng (**BPM — drag & drop agency**)
↓
linh hoạt điều chỉnh theo từng nghiệp vụ

~ ==n8n — workflow no-code — cho phần nghiệp vụ)==

---

## Trang 2 — Hồ sơ, platform & an toàn

### Hướng tiếp cận

- Số hóa
- Build multiagent
- Platform — flexible multiagent

Giải pháp dùng công nghệ — vấn đề an toàn

- guard rail: không chỉ liên quan đến kỹ thuật mà còn có trách nhiệm đạo đức
- nguồn dữ liệu lấy từ đâu? stakeholders là ai, làm gì
- ethical AI
- secure (**MCP phân role**)
  - Cùng 1 agent nhưng account ≠ nhau có thể được phân quyền ≠ nhau được sử dụng những quyền khác nhau
  - cùng một MCP nhưng các role khác nhau được phân quyền khác nhau
- responsible AI
- enterprise data dữ liệu tiền xử lý (unstructured data )

## Trang 3 — Kiến trúc & cơ chế phản biện

Không nên base vào **BPM** của SHB vì hiện tại có mã nguồn mở → về kiến trúc tổng quan.

⇒ **Show giai đoạn build** — khi nào build cái nào.

### ★ Cơ chế 2 LLM

Đưa toàn bộ kết luận của con LLM đầu tiên

→ nhờ đánh giá, phản biện.

**2 con: 1 con để phản biện, 1 con để làm.**

Phải quản lý được kỳ vọng, chỉ có 48h => chia thời gian thông minh để giải quyết bài toán

(full bức tranh => chọn giải quyết bài toán nào. Tập trung trong khuôn khổ kinh doanh- kinh doanh là gì? có khả thi để scale không?)

quản lý PnL (cắm LLM vào những điểm nào hợp lý) => có thể chứng minh break even point

---

data preparation có thể bổ sung các dữ liệu liên quan tới pháp luật

SHB. AI diamond 

Use case SHB

Hệ thống khi build flexible, cho define threshole => khi sử dụng thì điều chỉnh theo khẩu vị rủi ro ngân hàng

Mỗi sản phẩm vay của shb có đầu vào khác nhau => chọn 2 case: 1 case đơn giản và 1 case phức tạp hơn
