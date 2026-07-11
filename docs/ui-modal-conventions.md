# Quy ước Modal: Dock → Dialog (Admin PC)

Admin chỉ tối ưu **desktop**. Không ưu tiên mobile/responsive.

## Luồng chuẩn

```
Click row → mở AdminDockPanel (chi tiết + nút action)
         → bấm action trên dock → Dialog / AlertDialog
         → đóng dialog → dock có thể mở lại (nếu còn selection)
```

**Dock XOR Dialog:** chỉ hiện **một** trong hai. Không chồng dock + dialog.

## Container

| Container | Dùng khi | Ví dụ |
|-----------|----------|--------|
| **Floating dock** (`AdminDockPanel`) | Drill-down list: xem chi tiết + nhóm nút action | User, payment, report, course run preview, live session |
| **Dialog** (modal giữa) | Form chỉnh sửa / tạo — ngắn hoặc dài. Form dài dùng `sm:max-w-2xl` / `sm:max-w-4xl` + `max-h-[90vh] overflow-y-auto` | Edit role, ban, tạo/sửa program/course/event, syllabus, import Excel |
| **AlertDialog** (`ConfirmDialog`) | Xác nhận hủy / không hoàn tác | Lock, delete, end session, publish |
| **Trang riêng** (route) | Workspace nhiều tab, URL shareable | Course detail, Course run detail, Event detail |

## Không dùng

- **Sheet** cho form admin (đã thay bằng Dialog lớn). Sheet chỉ còn cho mobile sidebar layout nếu có.
- **`TableRowActionMenu` / dropdown ⋯ trên row** — mọi action nằm ở **dock footer** (hoặc page header trên trang detail).

## Filter

- Status / role / type trên toolbar = **`FilterSelect`** (shadcn `Select` + label), không dùng segmented tabs/chips.

## List pages có workspace lớn

Row click → **dock preview** + nút **Open workspace** (navigate). Không navigate ngay khi click row.
