import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/admin/page-header';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { programsApi } from '@/services/programs/programs-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { ProgramResponse } from '@/services/types/domain';

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã phải có ít nhất 2 ký tự')
    .max(50, 'Mã tối đa 50 ký tự'),
  title: z
    .string()
    .trim()
    .min(3, 'Tiêu đề phải có ít nhất 3 ký tự')
    .max(120, 'Tiêu đề tối đa 120 ký tự'),
  description: z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự').optional(),
});

type FormState = {
  code: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  isPublished: boolean;
  thumbnailFile: File | null;
};

const emptyForm: FormState = {
  code: '',
  title: '',
  description: '',
  thumbnailUrl: '',
  isPublished: false,
  thumbnailFile: null,
};

export function ProgramsListPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProgramResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const programsQuery = useQuery({
    queryKey: queryKeys.programs.list(),
    queryFn: programsApi.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        setFieldErrors(getZodFieldErrors(parsed.error));
        throw parsed.error;
      }
      setFieldErrors({});
      let thumbnailUrl = form.thumbnailUrl || null;
      if (form.thumbnailFile) {
        const uploaded = await assetsApi.upload(form.thumbnailFile);
        thumbnailUrl = uploaded.url;
      }
      const payload = {
        code: parsed.data.code,
        title: parsed.data.title,
        description: parsed.data.description || null,
        thumbnailUrl,
        isPublished: form.isPublished,
      };
      if (editing) {
        return programsApi.update(editing.id, payload);
      }
      return programsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật chương trình.' : 'Đã tạo chương trình.');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programsApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa chương trình.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<ProgramResponse>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã' },
      { accessorKey: 'title', header: 'Tiêu đề' },
      {
        accessorKey: 'isPublished',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge variant={row.original.isPublished ? 'default' : 'outline'}>
            {row.original.isPublished ? 'Đã xuất bản' : 'Nháp'}
          </Badge>
        ),
      },
      {
        accessorKey: 'courses',
        header: 'Khóa học',
        cell: ({ row }) => row.original.courses?.length ?? 0,
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.programCourses(row.original.id)}>
                Khóa học
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.programCourses(row.original.id)}>
                    Quản lý khóa học
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(row.original);
                    setForm({
                      code: row.original.code,
                      title: row.original.title,
                      description: row.original.description ?? '',
                      thumbnailUrl: row.original.thumbnailUrl ?? '',
                      isPublished: row.original.isPublished,
                      thumbnailFile: null,
                    });
                    setFieldErrors({});
                    setDialogOpen(true);
                  }}
                >
                  Chỉnh sửa
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
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Chương trình"
        description="Quản lý chương trình đào tạo và khóa học liên quan."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setFieldErrors({});
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Thêm chương trình
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={programsQuery.data ?? []}
        isLoading={programsQuery.isLoading}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>
              {editing ? 'Sửa chương trình' : 'Thêm chương trình'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="code">Mã</Label>
              <Input
                id="code"
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
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
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
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={form.description}
                rows={5}
                className="max-h-56"
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                {form.description.length}/5000 ký tự
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Ảnh thumbnail</Label>
              <Input
                id="thumbnail"
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
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isPublished}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isPublished: checked }))
                }
              />
              <Label>Xuất bản</Label>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chương trình?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa &quot;{deleteTarget?.title}&quot; — thao tác không thể hoàn tác.
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
