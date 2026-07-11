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
- **`TableRowActionMenu` / dropdown ⋯** — action hiển thị inline qua `AdminActionBar` (dock footer, detail header, card footer, syllabus row).
- **Link nhảy trang trong cell bảng list** — chỉ navigate qua **Go to manage** trên dock.

## Filter

- Status / role / type trên toolbar = **`FilterSelect`** (shadcn `Select` + label), không dùng segmented tabs/chips.

## Nút thao tác (dock & dialog)

Dùng `AdminActionBar` / `AdminFormDialogFooter` từ `@/components/admin/admin-action-bar`.

| Vai trò | Variant | Ví dụ |
|---------|---------|--------|
| Primary (hành động chính) | `default` | Save, Create, Go to manage, Resolve |
| Secondary | `outline` | Edit, Publish, Retry, Preview |
| Utility | `ghost` | Copy ref, Copy join token |
| Danger (dock / form trái) | `destructiveOutline` | Delete — viền đỏ, không fill |
| Danger (confirm AlertDialog) | `destructive` fill | Confirm delete / ban |
| Cancel (dialog) | `outline` | Luôn có Cancel bên trái nút primary |

**Dock footer:** một hàng, không wrap — scroll ngang nếu chật. Thứ tự: ghost → outline → destructiveOutline → primary (phải cùng).

**Editor dialog:** `AdminFormDialogFooter` — Cancel + Save; Delete (nếu có) nằm bên trái.

## List & detail

- **List:** row click → dock preview → **Go to manage** để navigate.
- **Detail header:** `AdminActionBar` — Edit (`outline`), Delete (`destructiveOutline`), action phụ (`outline`).
