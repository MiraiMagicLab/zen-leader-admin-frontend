import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/rich-text-editor';
import { getZodFieldErrors } from '@/lib/format-zod-error';
import { DataTable } from '@/components/data-table/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { stripHtml } from '@/lib/html';
import { queryKeys } from '@/hooks/query-keys';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { coursesApi } from '@/services/courses/courses-api';
import { programsApi } from '@/services/programs/programs-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseResponse } from '@/services/types/domain';

const schema = z.object({
  code: z.string().trim().min(2, 'Mã phải có ít nhất 2 ký tự'),
  title: z.string().trim().min(3, 'Tiêu đề phải có ít nhất 3 ký tự'),
  orderIndex: z.number().int().min(0, 'Thứ tự phải >= 0'),
});

type FormState = {
  code: string;
  title: string;
  description: string;
  orderIndex: number;
  thumbnailFile: File | null;
  programId: string;
};

const emptyForm: FormState = {
  code: '',
  title: '',
  description: '',
  orderIndex: 0,
  thumbnailFile: null,
  programId: '',
};

export function CoursesListPage() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isProgramScope = Boolean(programId);
  const [page, setPage] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CourseResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const programQuery = useQuery({
    queryKey: queryKeys.programs.detail(programId ?? ''),
    queryFn: () => programsApi.getById(programId!),
    enabled: isProgramScope,
  });

  const coursesQuery = useQuery({
    queryKey: [...queryKeys.courses.list(programId), page],
    queryFn: () =>
      isProgramScope ? coursesApi.getPage(page, 20, programId) : coursesApi.getPage(page, 20),
  });

  const programsQuery = useQuery({
    queryKey: queryKeys.programs.all,
    queryFn: () => programsApi.getAll(),
    enabled: dialogOpen && !isProgramScope && !editing,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const targetProgramId = editing?.programId ?? programId ?? form.programId;
      if (!targetProgramId) {
        setFieldErrors((prev) => ({
          ...prev,
          programId: 'Chọn chương trình.',
        }));
        throw new Error('Thiếu chương trình.');
      }
      const parsed = schema.safeParse({
        ...form,
        orderIndex: Number(form.orderIndex),
      });
      if (!parsed.success) {
        setFieldErrors(getZodFieldErrors(parsed.error));
        throw parsed.error;
      }
      setFieldErrors({});
      let thumbnailUrl: string | null = null;
      if (form.thumbnailFile) {
        thumbnailUrl = (await assetsApi.uploadViaPresigned(form.thumbnailFile)).downloadUrl;
      }
      const payload = {
        code: parsed.data.code,
        title: parsed.data.title,
        description: form.description || null,
        thumbnailUrl,
        programId: targetProgramId,
        orderIndex: parsed.data.orderIndex,
        tags: [],
      };
      if (editing) return coursesApi.update(editing.id, payload);
      return coursesApi.create(payload);
    },
    onSuccess: (result) => {
      toast.success(editing ? 'Đã cập nhật khóa học.' : 'Đã tạo khóa học.');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      if (!editing && result?.id) {
        void navigate(ROUTES.courseDetail(result.id, 'syllabus'));
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa khóa học.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreateDialog = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      programId: programId ?? '',
    });
    setFieldErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (course: CourseResponse) => {
    setEditing(course);
    setForm({
      code: course.code,
      title: course.title,
      description: course.description ?? '',
      orderIndex: course.orderIndex,
      thumbnailFile: null,
      programId: course.programId,
    });
    setFieldErrors({});
    setDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<CourseResponse>[]>(() => {
    const base: ColumnDef<CourseResponse>[] = [
      { accessorKey: 'code', header: 'Mã' },
      { accessorKey: 'title', header: 'Tiêu đề' },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-2 max-w-md text-sm">
            {stripHtml(row.original.description) || 'Chưa có mô tả'}
          </span>
        ),
      },
      {
        accessorKey: 'courseRuns',
        header: 'Đợt học',
        cell: ({ row }) => row.original.courseRuns?.length ?? 0,
      },
    ];

    if (!isProgramScope) {
      base.splice(2, 0, {
        id: 'program',
        header: 'Chương trình',
        cell: ({ row }) => (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to={ROUTES.programCourses(row.original.programId)}>
              {row.original.programCode ?? row.original.programId.slice(0, 8)}
            </Link>
          </Button>
        ),
      });
    }

    base.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={ROUTES.courseDetail(row.original.id)}>Chi tiết</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="mr-2 size-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return base;
  }, [isProgramScope]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {isProgramScope ? (
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.programs}>
            <ArrowLeft className="mr-2 size-4" />
            Quay lại chương trình
          </Link>
        </Button>
      ) : null}

      <PageHeader
        title={
          isProgramScope
            ? `Khóa học — ${programQuery.data?.title ?? '...'}`
            : 'Khóa học'
        }
        description={
          isProgramScope
            ? `Quản lý khóa học thuộc chương trình ${programQuery.data?.code ?? ''}.`
            : 'Danh sách toàn bộ khóa học. Tạo mới hoặc mở chi tiết để chỉnh giáo trình.'
        }
        actions={
          <Button onClick={openCreateDialog} disabled={saveMutation.isPending}>
            <Plus className="mr-2 size-4" />
            Thêm khóa học
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Tìm theo mã hoặc tiêu đề…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={coursesQuery.data?.data?.filter((c) => {
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              c.code.toLowerCase().includes(q) ||
              c.title.toLowerCase().includes(q) ||
              stripHtml(c.description).toLowerCase().includes(q)
            );
          }
          return true;
        }) ?? []}
        isLoading={coursesQuery.isLoading}
        showRowIndex
        pageOffset={page * 20}
        emptyMessage={
          isProgramScope
            ? 'Chưa có khóa học. Bấm "Thêm khóa học" để tạo mới.'
            : 'Chưa có khóa học nào. Bấm "Thêm khóa học" để tạo mới.'
        }
        showPagination={false}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Trang trước
        </Button>
        <span className="text-muted-foreground text-sm">
          Trang {page + 1} / {coursesQuery.data?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= (coursesQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </Button>
      </div>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>{editing ? 'Sửa khóa học' : 'Thêm khóa học'}</SheetTitle>
            {!editing ? (
              <p className="text-muted-foreground text-sm">
                Sau khi tạo, bạn sẽ được chuyển sang tab Giáo trình để thêm bài học.
              </p>
            ) : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {!isProgramScope && !editing ? (
              <div className="space-y-2">
                <Label>Chương trình</Label>
                <Select
                  value={form.programId || undefined}
                  onValueChange={(value) => {
                    setForm((f) => ({ ...f, programId: value }));
                    if (fieldErrors.programId) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.programId;
                        return next;
                      });
                    }
                  }}
                >
                  <SelectTrigger aria-invalid={Boolean(fieldErrors.programId)}>
                    <SelectValue placeholder="Chọn chương trình" />
                  </SelectTrigger>
                  <SelectContent>
                    {(programsQuery.data ?? []).map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} — {program.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.programId ? (
                  <p className="text-destructive text-sm">{fieldErrors.programId}</p>
                ) : null}
              </div>
            ) : null}
            {!isProgramScope && editing ? (
              <div className="space-y-2">
                <Label>Chương trình</Label>
                <p className="text-sm">
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link to={ROUTES.programCourses(editing.programId)}>
                      {editing.programCode ?? editing.programId}
                    </Link>
                  </Button>
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mã</Label>
                <Input
                  value={form.code}
                  aria-invalid={Boolean(fieldErrors.code)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, code: e.target.value }));
                    if (fieldErrors.code) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.code;
                        return next;
                      });
                    }
                  }}
                />
                {fieldErrors.code ? (
                  <p className="text-destructive text-sm">{fieldErrors.code}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  value={form.orderIndex}
                  aria-invalid={Boolean(fieldErrors.orderIndex)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, orderIndex: Number(e.target.value) }));
                    if (fieldErrors.orderIndex) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.orderIndex;
                        return next;
                      });
                    }
                  }}
                />
                {fieldErrors.orderIndex ? (
                  <p className="text-destructive text-sm">{fieldErrors.orderIndex}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={form.title}
                aria-invalid={Boolean(fieldErrors.title)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  if (fieldErrors.title) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.title;
                      return next;
                    });
                  }
                }}
              />
              {fieldErrors.title ? (
                <p className="text-destructive text-sm">{fieldErrors.title}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <RichTextEditor
                value={form.description}
                minHeight="10rem"
                placeholder="Mô tả ngắn khóa học (có thể bổ sung sau)…"
                onChange={(description) =>
                  setForm((f) => ({ ...f, description }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    thumbnailFile: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Lưu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khóa học?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa &quot;{deleteTarget?.title}&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
