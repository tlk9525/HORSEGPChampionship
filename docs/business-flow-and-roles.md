# Luồng nghiệp vụ và phân quyền vai trò

Tài liệu này mô tả luồng chính của hệ thống giải đua ngựa và quyền hạn của từng vai trò. Các tên trạng thái kỹ thuật như `raceEntries`, `preRaceStatus`, `resultStatus` được giữ nguyên để đối chiếu với code và cơ sở dữ liệu.

## 1. Luồng nghiệp vụ tổng quát

1. Admin tạo một giải đấu.
2. Admin tạo nhiều cuộc đua thuộc giải đấu đó, ví dụ 10 cuộc đua.
3. Mỗi cuộc đua có vòng đời đăng ký riêng.
4. Admin mở đăng ký cho từng cuộc đua.
5. Owner đăng ký một ngựa đã được duyệt vào cuộc đua đang mở.
6. Jockey đăng ký khả dụng cho cùng cuộc đua, hoặc Owner mời một jockey đang khả dụng cho cuộc đua đó.
7. Jockey chấp nhận hoặc từ chối lời mời cưỡi ngựa.
8. Admin duyệt đăng ký ngựa hoặc duyệt cặp Owner - Jockey.
9. Khi đóng đăng ký, hệ thống tự động lưu rating hiện tại của ngựa, tính trọng lượng được chỉ định, bốc cổng chạy và tạo danh sách xuất phát.
10. Admin công bố danh sách xuất phát.
11. Referee kiểm tra các cuộc đua được phân công, gồm ngựa, jockey, trang bị và điều kiện sẵn sàng.
12. Referee đánh dấu từng thí sinh là sẵn sàng, vắng mặt, bị gạch khỏi danh sách hoặc có sự cố.
13. Admin bắt đầu cuộc đua sau khi các thí sinh đã được kiểm tra và có ít nhất một thí sinh sẵn sàng.
14. Admin kết thúc cuộc đua.
15. Referee ghi vị trí về đích, thời gian hoàn thành, ghi chú, vi phạm và hình phạt nếu có.
16. Referee nộp kết quả nháp cho Admin xem xét.
17. Admin duyệt kết quả chính thức.
18. Hệ thống cập nhật rating của ngựa từ kết quả chính thức.
19. Cuộc đua chuyển sang trạng thái hoàn tất.

## 2. Quyền hạn theo vai trò

### Quản trị viên (Admin)

- Tạo và quản lý giải đấu.
- Tạo và cấu hình cuộc đua.
- Chọn hạng đua và khoảng trọng lượng được chỉ định.
- Phân công trọng tài.
- Duyệt tài khoản Owner, Jockey, hồ sơ ngựa, đăng ký jockey theo cuộc đua, đăng ký ngựa theo cuộc đua và cặp Owner - Jockey.
- Mở và đóng đăng ký cuộc đua.
- Công bố danh sách xuất phát.
- Bắt đầu và kết thúc cuộc đua.
- Duyệt kết quả chính thức.

### Chủ ngựa (Owner)

- Đăng ký tài khoản chủ ngựa.
- Tạo hồ sơ ngựa.
- Đăng ký ngựa đã được duyệt vào cuộc đua đang mở.
- Mời hoặc chọn jockey đang khả dụng cho cùng cuộc đua.
- Gửi yêu cầu đăng ký ngựa vào cuộc đua.
- Không được bắt đầu hoặc kết thúc cuộc đua.
- Không được nộp hoặc duyệt kết quả.

### Jockey

- Đăng ký tài khoản jockey.
- Tạo và cập nhật hồ sơ jockey, gồm cân nặng, chứng chỉ và kinh nghiệm.
- Đăng ký khả dụng cho một cuộc đua.
- Chấp nhận hoặc từ chối lời mời từ Owner.
- Không thể tự tạo entry chính thức trong danh sách xuất phát.
- Không được quản lý cuộc đua.
- Không được nộp hoặc duyệt kết quả.

### Trọng tài (Referee)

- Xem các cuộc đua được phân công.
- Thực hiện kiểm tra trước cuộc đua.
- Đánh dấu thí sinh là sẵn sàng, vắng mặt, bị gạch khỏi danh sách hoặc có sự cố.
- Ghi vị trí, thời gian hoàn thành, ghi chú, vi phạm và hình phạt sau khi Admin kết thúc cuộc đua.
- Nộp kết quả nháp cho Admin xem xét.
- Không được bắt đầu hoặc kết thúc cuộc đua.
- Không được duyệt kết quả chính thức.

### Hệ thống (System)

- Áp dụng mức trọng lượng cao nhất và thấp nhất theo hạng đua.
- Lưu snapshot rating của ngựa khi đóng đăng ký.
- Tính trọng lượng được chỉ định.
- Bốc cổng chạy ngẫu nhiên.
- Tạo danh sách xuất phát.
- Chỉ cập nhật rating của ngựa sau khi Admin duyệt kết quả chính thức.

### Khán giả (Spectator)

- Xem danh sách giải đấu công khai.
- Xem race card.
- Xem danh sách xuất phát đã công bố.
- Xem trạng thái cuộc đua trực tiếp.
- Xem kết quả chính thức.

## 3. Vòng đời cuộc đua

Trạng thái cuộc đua được tách riêng với trạng thái phê duyệt entry, trạng thái kiểm tra trước cuộc đua và trạng thái kết quả.

```text
Nháp
Mở đăng ký
Đóng đăng ký
Công bố danh sách xuất phát
Kiểm tra trước cuộc đua
Đang chạy
Đã kết thúc
Đã nộp kết quả nháp
Hoàn tất
Đã hủy
```

Ghi chú triển khai: hệ thống hiện biểu diễn bước `Check-in` bằng trạng thái Race `published` kết hợp với `preRaceStatus` của từng entry. Bước `Results Submitted` được biểu diễn bằng Race `status = finished` kết hợp với `resultStatus = submitted`.

## 4. Vòng đời phê duyệt đăng ký cuộc đua

Trạng thái phê duyệt cho biết ngựa và jockey đã được chấp nhận vào cuộc đua hay chưa.

```text
Chờ jockey xác nhận
Chờ Admin duyệt
Đã duyệt
Từ chối
Đã hủy
```

## 5. Trạng thái kiểm tra trước cuộc đua

Trạng thái kiểm tra thuộc về từng entry trong cuộc đua.

```text
Chờ kiểm tra
Sẵn sàng
Vắng mặt
Có sự cố
Bị gạch khỏi danh sách chạy
```

## 6. Trạng thái kết quả

Trạng thái kết quả thuộc về cuộc đua và từng entry.

```text
Nháp
Đã nộp
Chính thức
Bị loại
```

## 7. Quy tắc nghiệp vụ quan trọng

- Một giải đấu có nhiều cuộc đua.
- Ngựa đăng ký theo từng cuộc đua riêng lẻ, không đăng ký chung cho toàn giải đấu.
- Mỗi cuộc đua có cửa sổ đăng ký và quy trình phê duyệt riêng.
- Một ngựa không được tham gia cuộc đua đang hoạt động khác trong cùng giải đấu cho đến khi cuộc đua hiện tại hoàn tất hoặc bị hủy.
- Jockey phải khả dụng hoặc đã được duyệt cho cùng cuộc đua trước khi Owner có thể chọn.
- Referee chỉ nộp kết quả nháp.
- Cần Admin duyệt trước khi kết quả trở thành chính thức và trước khi rating của ngựa thay đổi.
- `horseRaceRegistrations` xử lý bước phê duyệt trước khi tạo dòng trong danh sách xuất phát chính thức.
- `raceEntries` là dòng chính thức trong danh sách xuất phát sau khi Admin duyệt.
- `Scratched` được dùng sau khi công bố danh sách xuất phát hoặc trong bước kiểm tra vì lý do vắng mặt, sức khỏe, trang bị, cân nặng hoặc quyết định khác của Referee/Admin.
