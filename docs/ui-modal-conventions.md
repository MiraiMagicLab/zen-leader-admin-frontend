# Quy ước Modal: AlertDialog vs Dialog vs Sheet vs Dock

Để UI nhất quán, chọn container theo bản chất tác vụ — không mặc định nhét mọi form vào Sheet.

| Container | Dùng khi | Ví dụ trong app |
|-----------|----------|-----------------|
| **AlertDialog** (`ConfirmDialog`) | Xác nhận / hành động không hoàn tác. Chỉ Có/Không (tối đa 1 ô lý do). | Xóa khóa/lớp/bài, ban user, publish/unpublish |
| **Dialog** (modal giữa) | Tác vụ ngắn, gọn: **≤ 4–5 ô đơn giản**, một quyết định, sửa nhanh. | Mã mua IAP, sửa ghi danh, thêm học viên, sửa bình luận, cập nhật vai trò |
| **Sheet** (drawer phải, `sm:w-[560px]`) | Form **dài/phức tạp**: rich text, upload ảnh/video, nhiều date-picker, nhiều bước. | Tạo/sửa khóa học, tạo/sửa lớp, tạo/sửa sự kiện, soạn bài học, import Excel |
| **Floating dock** (`AdminDockPanel`) | Đọc chi tiết / drill-down read-only + vài action nhẹ. Card nổi cách lề trên/phải/dưới — **không** dính mép như Sheet. | Audit log, payment order, moderation report, user, course run preview, enrollment detail |
| **Trang riêng** (route) | Quản lý một bản ghi, có URL riêng. | Course detail, Course run detail |

Nguyên tắc:

- **Nhất quán theo loại tác vụ**: cùng kiểu việc → cùng container trên toàn app.
- **Form Sheet rộng cố định 560px** (`className="… sm:w-[560px] sm:max-w-[560px]"`). Chỉ nới rộng khi nội dung thật sự cần.
- **Dialog dùng width chuẩn**: `sm:max-w-md` (mặc định); `sm:max-w-lg`/`sm:max-w-xl` khi lưới 2 cột.
- **List drill-down = `AdminDockPanel`**, không dùng `AdminInspector` / Sheet edge-locked.
- **Dock XOR Dialog**: chỉ hiện **một** trong hai. Khi mở Dialog/AlertDialog từ dock → đóng dock (giữ `selected*` để form vẫn có data). Khi đóng dialog → có thể mở lại dock nếu vẫn còn selection.
- **Filter list (status/role/type) = `FilterSelect`** (shadcn `Select` + label), không dùng segmented chips/tabs.
- **Row actions = `TableRowActionMenu`**: 1 primary ghost + menu ⋯ (destructive trong menu).
- Khi phân vân Dialog vs Sheet: ≤ 5 ô đơn giản → Dialog. Có rich text / upload / nhiều bước → Sheet.
