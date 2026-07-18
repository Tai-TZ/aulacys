# Flow draft (cũ)

> **Đã superseded.** Quy trình nghiệp vụ đã confirm (5 stage, tín chấp tiêu dùng):
> [`FLOW-BUSINESS-CONFIRMED.md`](./FLOW-BUSINESS-CONFIRMED.md).  
> File này giữ làm bản nháp lịch sử — đừng build theo số bước 1343/2290 bên dưới.

## Tiếp nhận hồ sơ

Khách hàng nộp bộ hồ sơ gồm:

- Đơn đề nghị vay tín chấp theo mẫu của ngân hàng\. 

- CCCD/CMND còn hiệu lực\. 

- Bảng lương hoặc sao kê lương tối thiểu 03 tháng gần nhất\. 

- Hợp đồng lao động hoặc Quyết định bổ nhiệm còn hiệu lực\. 

### Quy trình to be

Sau khi tiếp nhận hồ sơ, nhân viên vận hành sẽ:

1343. Đọc toàn bộ hồ sơ khách hàng\. \(AI scan\)

1344. Đọc và trích xuất thông tin từ từng tài liệu \(AI\)

1345. Nhập vào template có sẵn trên hệ thống\. \(AI\)

1346. Lập **Tờ trình tín dụng \(Credit Memo\)**\. \(AI\)

1347. Kiểm tra tính đầy đủ của hồ sơ\. \& Kiểm tra tính chính xác giữa thông tin trên hệ thống và hồ sơ gốc

### Output

- Tờ trình tín dụng

---

## Thẩm định

### Input

- Tờ trình tín dụng\. 

- Thông tin CIC\. 

- tính DTI

### Quy trình hiện tại

AI có thể 

2290. Tiếp nhận Tờ trình tín dụng\. 

2291. Tra cứu CIC\. 

2292. Tính toán DTI \(Debt\-to\-Income\)\. 

2293. Đánh giá khách hàng có đáp ứng điều kiện vay hay không\. 

2294. Thẩm định phương án tín dụng\. 

2295. Chấm điểm khách hàng\.=\> Thiết lập mức lãi suất đề xuất

2296. Gen hợp đồng tín dụng 

Lãi suất được xác định dựa trên các tiêu chí:

- CIC 

- Hạng khách hàng 

- Kỳ hạn vay 

- Risk Premium 

Sau khi hoàn thành đánh giá đề xuất hướng =\> người revie đánh

- Hợp đồng tín dụng\.



### Output

- Hợp đồng tín dụng\. 

## Phê duyệt  \(k có AI\)

Người có thẩm quyền sẽ xem:

- Hồ sơ khách hàng\. 

- Tờ trình tín dụng\. 

- Kết quả thẩm định\. 

- Hợp đồng tín dụng\. 

Sau đó đưa ra quyết định:

- Approve\. 

- Reject\. 

- Hoặc yêu cầu bổ sung hồ sơ\. 



---

## Giải ngân

Trước khi giải ngân AI sẽ check

- Kiểm tra lại CIC\. 

- Kiểm tra các điều kiện giải ngân\. 

- Xác nhận khách hàng vẫn đủ điều kiện\. 

Một khoản vay:

- Chỉ được giải ngân trong khoảng **3–6 tháng** kể từ thời điểm được phê duyệt\. 

- Có thể giải ngân nhiều lần tùy theo chính sách sản phẩm\. 

=\> có thể nếu k cần hil thì sẽ tự book giải ngân luôn, nếu cần thì qua bước phê duyệt





=\> phê duyệt hay không là do nhu cầu và khẩu vị của từng doanh nghiệp set cho các quy trình nên việc phê duyệt nên để động, k fix 

