# Quy trình vay tín chấp — Luồng 6 bước & Đề xuất giải pháp Multi-Agent

Target: Quy trình vay tín dụng tiêu dùng cá nhân

Lý do lựa chọn: 

## Luồng 6 bước: 

Đây là quy trình tổng quan bao gồm các bước cơ bản của hầu hết các quy trình vay tín dụng (cá nhân, hộ kinh doanh, doanh nghiệp)

Trong khuôn khổ 48h hackathon, team lựa chọn một usecase đơn giản và một use case phức tạp hơn của quy trình vay tín dụng tiêu dùng cá nhân để demo ý tưởng. Build base để có thể scale với các use case khác

|                       | 1. Tiếp nhận hồ sơ                                                                                                                                                                                                            | 2. Đề xuất phương án (RM)                                                                                                                                                                                                                    | 3. Thẩm định                                                                                                                                                                                                 | 4. Phê duyệt                                                                                                                                                                                                                                                                    | 5. Giải ngân                                                                                                                                                         | 6. Kiểm tra mục đích sử dụng vốn                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Activities**  | **RM**<br />- Nhận hồ sơ (Đơn vay, CCCD/CMND, sao kê lương ≥3 tháng, HĐLĐ/QĐ bổ nhiệm)<br />- Đọc toàn bộ hồ sơ<br />- Trích xuất thông tin từng tài liệu<br />- Nhập thủ công vào template | **RM**<br />- Dùng thông tin hồ sơ đã tiếp nhận<br />- Lấy data từ CIC<br />- Tính DTI trên file Excel<br />- Đánh giá KH <br />- Đề xuất phương án cho vay (giá trị, lãi suất, kỳ hạn, số lần giải ngân) | **Bộ phận thẩm định**<br />- Tiếp nhận đề xuất từ RM<br />- Tiến hành thẩm định phương án, thẩm định pháp lý, thẩm định khả năng trả nợ<br />- Pass → chuyển phê duyệt | **Người có thẩm quyền phê duyệt**<br />- Check lại đề xuất, khách hàng<br />- Ra quyết định: Approve / Reject / Yêu cầu bổ sung<br />- Kí hợp đồng tín dụng<br /><br />**RM** Gửi khách hàng ký, sau khi khách hàng phê duyệt xong  | **Chuyên viên hỗ trợ tín dụng**<br />- Check CIC (case giải ngân ngay sau khi không cần)<br />- thường check với các case nộp trong 3-6 tháng  | **Chuyên viên hỗ trợ tín dụng**<br />- Sau ~3 tháng Kiểm tra mục đích sử dụng vốn dựa trên bản kê khai + hóa đơn, chứng từ |
| **Pain Points** | - Tốn thời gian đọc + nhập liệu thủ công<br />- Rủi ro sai sót khi nhập liệu                                                                                                                                      | - Dữ liệu phân mảnh, tốn thời gian tổng hợp<br />- Tốn thời gian để so sánh và đánh giá                                                                                                                                         | - Tốn thời gian để so sánh và đánh giá                                                                                                                                                                | - Vẫn phải rà soát lại đề xuất + hồ sơ KH                                                                                                                                                                                                                               |                                                                                                                                                                        |                                                                                                                                                          |
| **Touchpoints** | - Bộ hồ sơ<br />- Hệ thống nội bộ                                                                                                                                                                                          | - Hệ thống nội bộ để check Hồ sơ KH<br />- File excel<br />- File đều xuất phương án cho vay                                                                                                                                         | - Đề xuất phương án<br />Hồ sơ pháp lý• Dữ liệu thu nhập/khả năng trả nợ                                                                                                                      | • Đề xuất phương án• Kết quả thẩm định• Hồ sơ KH                                                                                                                                                                                                                  | • Hệ thống CIC• Khế ước nhận nợ (output)                                                                                                                      | • Bản kê khai mục đích sử dụng vốn• Hóa đơn, chứng từ                                                                                     |

**Output chính từng bước:**

- Bước 2 → Đề xuất phương án cho vay
- Bước 3 → Đề xuất hợp đồng tín dụng
- Bước 4 → Hợp đồng tín dụng đã ký
- Bước 5 → Khế ước nhận nợ

---

Dựa trên painpoint trên và mục tiêu của Ngân hàng SHB đến năm 2030 trở thành ngân hàng số 1 về hiệu quả, ngân hàng số được yêu thích, tầm nhìn đến năm 2035, SHB phấn đấu trở thành ngân hàng hiện đại, ngân hàng số, ngân hàng xanh thuộc nhóm dẫn đầu khu vực. Nhóm đề xuất giải pháp Multi-agent với khả năng có thể customize dựa trên khẩu vị rủi ro của từng khách hàng.
Giải pháp bao gồm Agent.... 

định vị sản phẩm: multi agent hỗ trợ ra quyết định và giảm tối đa thời thực hiện repetitive manual task, có thể mở rộng và triển khai cho những use case khác nhau 

Với use case đơn giản, straight through process, giải pháp thay thế gần như toàn bộ công việc của các bộ phận trong quy trình vay tín dụng tiêu dùng từ khi nhận hồ sơ cho đến khi giải ngân. Tùy thuộc vào mức độ phức tạp của chân dung khách hàng và gói vay mà khả năng của AI có thể thay đổi.

Multi agent sẽ thể hiện rõ nhất 


Giá trị của giải pháp: 

- với use case đơn giản:

Lộ trình thử nghiệm hoặc triển khai pilot

Mô hình kinh doanh và tiềm năng phát triển
