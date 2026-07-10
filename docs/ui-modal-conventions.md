# Quy ước Modal: AlertDialog vs Dialog vs Sheet

Để UI nhất quán và chuyên nghiệp, chọn container theo bản chất tác vụ — không mặc định nhét mọi form vào Sheet.

| Container | Dùng khi | Ví dụ trong app |
|-----------|----------|-----------------|
| **AlertDialog** (`ConfirmDialog`) | Xác nhận / hành động không hoàn tác. Chỉ Có/Không (tối đa 1 ô lý do). | Xóa khóa/lớp/bài, ban user, publish/unpublish |
| **Dialog** (modal giữa) | Tác vụ ngắn, gọn: **≤ 4–5 ô đơn giản**, một quyết định, sửa nhanh. | Mã mua IAP, sửa ghi danh, thêm học viên, sửa bình luận, cập nhật vai trò, ban user |
| **Sheet** (drawer phải, `sm:w-[560px]`) | Form **dài/phức tạp**: rich text, upload ảnh/video, nhiều date-picker, nhiều mục, hoặc **nhiều bước**. | Tạo/sửa khóa học, tạo/sửa lớp, tạo/sửa sự kiện, soạn bài học, import Excel |
| **Trang riêng** (route) | Quản lý một bản ghi, có URL riêng. | Course detail, Course run detail |
| **Inspector** (`AdminInspector`) | Đọc chi tiết / drill-down read-only + vài action nhẹ. Không phải form dài. | Audit metadata, payment order, moderation target, user profile |

Nguyên tắc:

- **Nhất quán theo loại tác vụ**: cùng kiểu việc → cùng container trên toàn app.
- **Form Sheet rộng cố định 560px** (`className="… sm:w-[560px] sm:max-w-[560px]"`). Chỉ nới rộng khi nội dung thật sự cần (bảng nhiều cột).
- **Dialog dùng width chuẩn**: `sm:max-w-md` (mặc định) cho form 1 cột; `sm:max-w-lg`/`sm:max-w-xl` khi có lưới 2 cột hoặc danh sách chọn.
- **Inspector** dùng cho xem chi tiết; Sheet dùng cho soạn/sửa form dài.
- Khi phân vân giữa Dialog và Sheet: đếm số ô. ≤ 5 ô đơn giản → Dialog. Có rich text / upload / nhiều bước → Sheet.
