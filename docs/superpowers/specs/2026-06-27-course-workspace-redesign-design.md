# Course Workspace — thiết kế lại luồng flagship quản lý khóa học

Ngày: 2026-06-27
Phạm vi: `zen-leader-admin-frontend`
Trạng thái: đã duyệt thiết kế (chờ duyệt spec)

## 1. Vấn đề

Khách hàng phản hồi admin "khó dùng". Bốn điểm đau được xác nhận: (1) không biết bắt đầu/đi đâu, (2) bảng dữ liệu rối + cuộn ngang, (3) form tạo/sửa khó, (4) thiếu hướng dẫn/phản hồi.

Gốc rễ là information architecture của luồng chính — quản lý một khóa học. Hiện tại để dựng xong một khóa, admin phải đi qua: trang Courses → sheet tạo → Course Detail (3 tab: Overview / Syllabus / Course runs) → tab Runs → sheet tạo run → trang Course Run Detail riêng (2 tab: Sessions / Enrollment). Nhiều lần chuyển trang, tab lồng tab, và **không hề có chỉ báo khóa đã "đủ" hay còn thiếu gì**.

## 2. Mục tiêu & phạm vi

Làm chuẩn **một luồng flagship**: trang quản lý một khóa học, biến nó thành **Course Workspace** — một trang duy nhất tự dẫn dắt. Đây sẽ là mẫu chuẩn (progress + checklist + section dọc) để nhân rộng sang các khu vực khác sau này.

Trong phạm vi (Phase 1):
- Thay `course-detail-page.tsx` (đang dùng tab) bằng một trang Workspace cuộn dọc.
- Header có trạng thái + % hoàn thiện.
- Checklist "Các bước tiếp theo" tính từ dữ liệu thật, bấm để cuộn tới section.
- Các section theo đúng thứ tự quy trình: Thông tin · Giáo trình · Các lớp.
- Mỗi lớp hiển thị thẻ tóm tắt (trạng thái, giá, số buổi, số học viên, hạn ghi danh) với lối đi nhanh tới quản lý chi tiết.

Ngoài phạm vi (ghi nhận cho sau):
- Gộp toàn bộ quản lý Session/Enrollment vào inline trong Workspace (Phase 2 — hiện vẫn deep-link sang `course-run-detail-page`).
- Mini-wizard "Hướng dẫn nhanh" cho admin mới (tùy chọn, Phase 2).
- Redesign các khu vực khác (Events, Users…).
- Bất kỳ thay đổi backend nào. Không có.

## 3. Ràng buộc

- Không đổi backend. Mọi dữ liệu lấy từ `GET /api/v1/courses/{id}` (đã trả `syllabusSections[].items` và `courseRuns[].courseSessions`).
- Giữ stack hiện có: React 19, React Router 7, TanStack Query, shadcn/ui, Tailwind v4. Theo pattern sẵn có trong `src/features`.
- `CourseResponse` không có cờ xuất bản; "sẵn sàng cho học viên" được suy ra, không phải field mới (xem §5).

## 4. Kiến trúc & component

Trang mới `course-workspace-page.tsx` thay cho `course-detail-page.tsx` tại route `\/courses\/:courseId`. Bỏ tham số `?tab=`; thay bằng `?section=` (tùy chọn) để cuộn tới một section khi điều hướng từ nơi khác (ví dụ sau khi tạo course → `?section=syllabus`).

Cấu trúc, mỗi đơn vị một trách nhiệm rõ:

- `course-workspace-page.tsx` — orchestrator: gọi query course detail, dựng layout, sở hữu state các sheet (edit course, create/edit run), truyền xuống các con. Mỏng, không chứa logic tính toán.
- `hooks/use-course-completion.ts` — **hàm thuần** `computeCourseCompletion(course): CompletionResult`. Trả về danh sách bước (id, nhãn, done, tóm tắt) + `percent` + `status` ('draft' | 'ready'). Đây là nơi duy nhất chứa logic "đủ hay chưa" → dễ test độc lập.
- `components/course-progress-header.tsx` — breadcrumb, tên + code, badge trạng thái, thanh %, nút phụ "Sửa thông tin", và **CTA chính**. CTA chính suy từ tiến độ: khi `status === 'draft'`, nhãn là "Tiếp tục: <bước chưa xong đầu tiên>" và bấm sẽ cuộn tới section của bước đó (không có hành động "Xuất bản" vì Course không có cờ publish — nhãn "Xuất bản" trong mockup chỉ minh họa, bị thay thế bởi quy ước này); khi `status === 'ready'`, không hiện CTA chính (chỉ còn nút "Sửa thông tin"). Nhận `CompletionResult` + course, không tự tính.
- `components/course-checklist.tsx` — render các bước từ `CompletionResult`; mỗi bước bấm để cuộn tới anchor section tương ứng; bước chưa xong được làm nổi + nút hành động.
- `components/workspace-section.tsx` — khung section tái dùng: `id` (anchor), tiêu đề, nút action ở góc, children. Dùng cho cả 3 section.
- `components/course-runs-section.tsx` + `components/course-run-card.tsx` — danh sách lớp; mỗi card tóm tắt + nút "Quản lý lớp" (deep-link `course-run-detail-page`) và sửa/xóa.
- Tái dùng nguyên trạng: `syllabus-editor.tsx` (đặt trong section Giáo trình), `create-course-run-sheet.tsx`, sheet sửa course (tách từ `courses-list-page.tsx` nếu cần dùng chung).

Luồng dữ liệu: `course-workspace-page` là chủ sở hữu query (`queryKeys.courses.detail`). Mutation (tạo/sửa run, sửa course, sửa syllabus) invalidate query này → header/checklist/section tự tính lại tiến độ. Một nguồn sự thật duy nhất.

## 5. Logic tính tiến độ (suy từ dữ liệu thật)

`computeCourseCompletion(course)` định nghĩa 5 bước, mỗi bước là boolean suy từ `CourseResponse`:

1. `info` — Thông tin khóa học: có `title`, `code`, và `description` không rỗng. (Thumbnail tùy chọn, không tính.)
2. `syllabus` — Giáo trình: `syllabusSections.some(s => s.items.length > 0)`.
3. `runs` — Mở lớp: `courseRuns.length > 0`.
4. `sessions` — Buổi học: có lớp nào đó với `(courseSessions ?? sessions ?? []).length > 0`.
5. `ready` — Sẵn sàng cho học viên: `courseRuns.some(r => r.status === 'OPEN')`. Đây thay cho "Xuất bản" (vì Course không có cờ publish) — một lớp OPEN nghĩa là khóa thực sự có thể ghi danh.

`percent = round(soBuocXong / 5 * 100)`. `status = 'ready'` nếu bước `ready` xong, ngược lại `'draft'`. Badge: 'ready' → "Sẵn sàng" (success tint); 'draft' → "Nháp" (warning tint).

Mỗi bước kèm `summary` ngắn để hiển thị bên phải (vd "2 chương · 4 bài", "3 buổi", "1 lớp"). Bước đầu chưa xong là bước được làm nổi trong checklist.

## 6. Bảng & form (xử lý đau số 2, 3)

- Trong section, danh sách dùng **hàng có viền** (bordered rows), không bảng nhiều cột cuộn ngang. Lớp/chương/bài đều là card/row gọn, hành động gom vào menu khi cần.
- Section "Các lớp" thay bảng course-run nhiều cột bằng card tóm tắt (đã mockup) — bỏ cuộn ngang hoàn toàn.
- Form tạo/sửa giữ ở sheet hiện có nhưng đặt đúng ngữ cảnh (mở từ trong section liên quan), nên admin không phải nhớ "field này ở đâu". Cải thiện sâu hơn cho form là Phase 2.

## 7. Empty states (xử lý đau số 4)

Mỗi section khi rỗng hiển thị lời mời + CTA, không phải "Chưa có dữ liệu":
- Giáo trình rỗng: "Thêm chương đầu tiên để dựng nội dung khóa học" + nút "Thêm chương".
- Các lớp rỗng: "Mở lớp để xếp lịch và cho học viên ghi danh" + nút "Mở lớp mới".
- Lớp chưa có buổi: "Thêm buổi học cho lớp này" + nút.
Văn phong: câu thường, tiếng Việt, động từ đứng trước.

## 8. Testing

- Unit test `computeCourseCompletion` (thuần, dễ test): các shape course khác nhau → đúng `done`, `percent`, `status`. Ca biên: course trống, có syllabus nhưng section rỗng item, có run DRAFT (chưa ready), có run OPEN (ready).
- Smoke test render `course-workspace-page` với mock query: hiện đủ header + checklist + 3 section; checklist phản ánh đúng tiến độ.
- Thủ công: chạy theo dữ liệu seed `ZEN-FLOW-101` (4/5 bước, 80%, badge "Nháp"); mở lớp OPEN → thành "Sẵn sàng" 100%.

## 9. Rủi ro & giảm thiểu

- Trang dài: dùng `workspace-section` với tiêu đề rõ + checklist neo nhảy nhanh; cân nhắc thu gọn section (collapse) nếu quá dài — quyết định lúc implement.
- Lệ thuộc 1 query lớn: chấp nhận được; đã là cách `course-detail-page` hoạt động. Mutation invalidate đúng key.
- Phá vỡ deep-link cũ `?tab=`: thêm redirect/ tương thích `?tab=syllabus|runs` → `?section=...` để link cũ không chết.

## 10. Việc cần làm (tóm tắt cho bước lập kế hoạch)

1. `use-course-completion.ts` + test.
2. `workspace-section.tsx`.
3. `course-progress-header.tsx`.
4. `course-checklist.tsx` (cuộn tới anchor).
5. `course-run-card.tsx` + `course-runs-section.tsx`.
6. `course-workspace-page.tsx` lắp ráp, thay route, tái dùng `syllabus-editor` + các sheet; xử lý tương thích `?tab=`.
7. Empty states + văn bản tiếng Việt.
8. Smoke test + chạy thử trên dữ liệu seed.
