# Task 1 có hình thật

## Problem Statement
Làm thế nào để mỗi đề IELTS Writing Task 1 có biểu đồ, bảng, bản đồ hoặc quy trình mà người học nhìn vào để viết, và AI chấm đối chiếu được với chính số liệu đó?

Hiện tại đề Task 1 chỉ là một đoạn chữ ("The bar chart below shows…"), không có hình. Đề đi qua các bước sau, và không bước nào có số liệu:

1. `generate-prompts`
2. `sessionStorage`
3. `new-task-form`
4. Firestore, trường `prompt` dạng chữ thuần
5. `task-detail` và `compare-versions`
6. Các API `evaluate` và `generate-sample`

Vì vậy AI chấm cũng không kiểm tra được độ chính xác số liệu, trong khi đó là phần lớn của tiêu chí Task Achievement.

## Recommended Direction
Kết hợp hướng 1, 2 và 3 từ buổi brainstorm:

1. **AI tạo số liệu dạng cấu trúc, app tự vẽ hình.** Gemini trả về một bản đặc tả hình (`visual`) dạng JSON: loại hình, tiêu đề, trục, đơn vị, chuỗi số liệu. App vẽ bằng Recharts (đã có sẵn trong dự án) theo phong cách đề thi: nền trắng như giấy thi (giữ trắng cả ở chế độ tối), chữ đen xám, có đơn vị và chú thích. Câu đề được ghép từ chính bản đặc tả, nên chữ và hình không lệch nhau.
2. **Kiểm tra số liệu ở server trước khi hiển thị.** Ví dụ: tổng biểu đồ tròn 98–102%, số giá trị khớp số mốc trục X, bảng đủ ô. Đề nào sai thì loại bỏ đề đó; không tạo lại cả lô, để tiết kiệm quota.
3. **Map và Process vẽ từ khuôn mẫu.** Process là chuỗi bước có mũi tên, có hỗ trợ chu trình khép kín. Map là hai bản "trước / sau", mỗi bản là lưới 3×3 ô có nhãn khu vực. AI chỉ điền nội dung vào khuôn.

`visual` được lưu cùng bài làm và gửi kèm mỗi lần chấm, để AI trừ điểm khi mô tả sai số hoặc bỏ sót xu hướng chính.

Lựa chọn của người dùng (2026-10-29):
- Hình phải giống đề thật.
- Map và Process có luôn ở dạng sơ đồ đơn giản.
- AI chấm cả độ chính xác số liệu.

Hai lựa chọn đầu có độ vênh: Map và Process ở dạng sơ đồ đơn giản sẽ khác bản vẽ minh họa trong đề Cambridge. Đợt đầu chấp nhận khoảng cách đó.

### Định dạng `visual` (phiên bản 1)

| Loại | Dữ liệu | Server kiểm tra |
|---|---|---|
| Bar / Line | trục X (≤12 mốc), 1–6 chuỗi số, đơn vị | số giá trị khớp số mốc, toàn là số hữu hạn |
| Pie | 1–2 hình tròn, mỗi hình 3–8 lát | tổng mỗi hình 98–102% |
| Table | cột, hàng, ô (số hoặc chữ ngắn) | đủ ô, không thiếu hàng |
| Mixed | 2 phần, mỗi phần là bar, line, pie hoặc table | mỗi phần hợp lệ |
| Process | 4–12 bước, đánh dấu có khép vòng hay không | đủ số bước, nhãn ngắn |
| Map | 2 thời điểm, lưới 3×3 ô có nhãn khu vực | 9 ô mỗi bản, nhãn ngắn |

- Mỗi bản đặc tả có `version: 1`.
- Mọi chuỗi đều giới hạn độ dài.
- Tổng dung lượng tối đa khoảng 10KB.

### Ảnh hưởng tới database
| Thay đổi | Mức độ | Ghi chú |
|---|---|---|
| Thêm trường `visual` vào `users/{uid}/tasks/{id}` | Nhỏ | Khoảng 2–10KB mỗi bài, xa giới hạn 1MB của Firestore |
| Bài cũ không có `visual` | Không cần migration | Không có `visual` thì giao diện chỉ hiện chữ như hiện nay |
| Firestore rules | Không đổi | Dữ liệu vẫn nằm dưới `users/{uid}` |

Rủi ro dữ liệu:
- `visual` là dữ liệu do AI sinh ra. Khi đọc lại phải kiểm tra cấu trúc trước khi vẽ và không chèn thẳng vào HTML.
- Không đổi định dạng `visual` sau khi bài đã được lưu, vì `version` dùng để vẽ đúng các bài cũ.

## Key Assumptions to Validate
- [x] **Gemini trả số liệu hợp lệ ổn định.**
  - Lần chạy thử đầu với schema phẳng: 9/17 đề hợp lệ (53%). Lỗi gặp phải: thiếu chuỗi số, Map không đủ 9 ô, và lần tạo đề trộn chỉ trả 1 đề.
  - Sau khi đổi sang mỗi loại một khối riêng với trường bắt buộc, Map mô tả bằng vị trí la bàn, và số đề cố định trong schema: 19/19 đề hợp lệ (100%).
  - Cả hai lần chạy đều trên model dự phòng `gemini-3.5-flash-lite`, vì model chính hết quota.
- [ ] **Số liệu trông như đề thật.** Xem nhanh 6 mẫu thấy hợp lý (có xu hướng rõ, tổng biểu đồ tròn đúng 100%). Vẫn cần người học IELTS lâu năm xem 10 đề mẫu.
- [x] **AI chấm bắt được số sai.** Thử một bài cố tình viết sai 2 con số (Đức 2020: 93 thay vì 68,4; Brazil 2010: 75 thay vì 45). Cả 2 lỗi đều bị chỉ ra trong phần Task Response và trong nhận xét từng câu, mỗi lỗi kèm câu sửa đúng số. Điểm Task Response bị hạ xuống 3.

Phát sinh khi làm:
- Câu đề do AI viết có lúc lệch với hình, ví dụ ghi "four countries" nhưng hình chỉ có 3 nước. Đã thêm yêu cầu mọi con số đếm trong đề phải khớp số liệu, nhưng chưa có bước kiểm tra tự động ở server.

## MVP Scope
**Có trong bản đầu:**
- Route `generate-prompts` trả về `visual` cho đề Task 1, kèm bước kiểm tra số liệu ở server.
- Component vẽ hình cho 7 loại: Bar, Line, Pie, Table, Mixed, Process, Map.
- Hiển thị hình ở 5 nơi:
  - thẻ đề và hộp xem trước trong Prompts Library,
  - form viết bài,
  - trang chi tiết bài,
  - trang so sánh bản nháp.
- Lưu `visual` vào bài làm trong Firestore.
- Route `evaluate` và `generate-sample` nhận `visual` và đưa số liệu vào prompt gửi Gemini.

**Không có trong bản đầu:** xem mục bên dưới.

## Not Doing (and Why)
- **Ảnh do AI vẽ (Imagen…):** không lấy lại được số liệu để chấm, chữ trong ảnh hay sai, tốn quota.
- **Kho đề dùng chung (hướng 7):** cần collection mới và sửa Firestore rules. Để đợt sau; đây là cách tiết kiệm quota tốt nhất về lâu dài.
- **Tải ảnh đề từ sách lên (hướng 6):** là tính năng riêng, cần Firebase Storage.
- **Map vẽ minh họa như đề Cambridge:** quá tốn công so với giá trị ở đợt đầu; dùng lưới 3×3 trước.
- **Tạo hình cho đề tự gõ tay hoặc bài cũ:** không có số liệu gốc; giao diện chỉ hiện chữ.
- **Cho người dùng sửa số liệu:** không cần cho việc luyện viết.

## Open Questions
- Mỗi lần bấm Generate ở tab Task 1, giữ 6 đề hay giảm còn 4? Gợi ý: 4, để giảm rủi ro output bị cắt và tiết kiệm quota.
- Thẻ đề trong Prompts Library hiện hình thu nhỏ, hay chỉ hiện hình khi mở xem trước? Gợi ý: hình thu nhỏ trên thẻ.
