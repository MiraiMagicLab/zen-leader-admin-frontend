import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActions, tableActionsColumn } from '@/components/admin/table-row-actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { queryKeys } from '@/hooks/query-keys';
import { formatDate } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { programsApi } from '@/services/programs/programs-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { ProgramResponse } from '@/services/types/domain';

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code max 50 characters'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title max 120 characters'),
  description: z.string().trim().max(5000, 'Description max 5000 characters').optional(),
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
  useAdminPageMeta(ADMIN_PAGE_META.programs);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProgramResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('all');

  const programsQuery = useQuery({
    queryKey: [...queryKeys.programs.list(), page],
    queryFn: () => programsApi.getPage(page, ADMIN_LIST_PAGE_SIZE),
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
        const uploaded = await assetsApi.uploadViaPresigned(form.thumbnailFile);
        thumbnailUrl = uploaded.downloadUrl;
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
      toast.success(editing ? 'Program updated.' : 'Program created.');
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
      toast.success('Program deleted.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openEditDialog = (program: ProgramResponse) => {
    setEditing(program);
    setForm({
      code: program.code,
      title: program.title,
      description: program.description ?? '',
      thumbnailUrl: program.thumbnailUrl ?? '',
      isPublished: program.isPublished,
      thumbnailFile: null,
    });
    setFieldErrors({});
    setDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<ProgramResponse>[]>(
    () => [
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'title', header: 'Title' },
      {
        accessorKey: 'isPublished',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.isPublished ? 'default' : 'outline'}>
            {row.original.isPublished ? 'Published' : 'Draft'}
          </Badge>
        ),
      },
      {
        accessorKey: 'courses',
        header: 'Courses',
        cell: ({ row }) => row.original.courses?.length ?? 0,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created date',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        ...tableActionsColumn<ProgramResponse>(),
        cell: ({ row }) => (
          <TableRowActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.programCourses(row.original.id))}
            >
              Course
            </Button>
            <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
            >
              Delete
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Programs"
        description="Manage training programs and related courses."
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
            Add program
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by code or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={programsQuery.data?.data?.filter((p) => {
          if (publishedFilter === 'published' && !p.isPublished) return false;
          if (publishedFilter === 'draft' && p.isPublished) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              p.code.toLowerCase().includes(q) ||
              p.title.toLowerCase().includes(q)
            );
          }
          return true;
        }) ?? []}
        isLoading={programsQuery.isLoading}
        showRowIndex
        pageOffset={page * ADMIN_LIST_PAGE_SIZE}
        showPagination={false}
      />

      <ServerPagination
        page={page}
        totalPages={programsQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>
              {editing ? 'Edit program' : 'Add program'}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
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
              <Label htmlFor="title">Title</Label>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                rows={5}
                maxLength={5000}
                placeholder="Short program summary (optional)"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <p className="text-muted-foreground text-xs">
                {form.description.length}/5000 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail image</Label>
              <ImageFilePicker
                id="thumbnail"
                file={form.thumbnailFile}
                existingUrl={form.thumbnailUrl}
                previewAlt={form.title || 'Program thumbnail'}
                onFileChange={(thumbnailFile) =>
                  setForm((f) => ({ ...f, thumbnailFile }))
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
              <Label>Publish</Label>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
