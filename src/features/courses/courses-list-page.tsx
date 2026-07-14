import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';
import { z } from 'zod';

import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { ServerPagination } from '@/components/admin/server-pagination';
import { RichTextEditor } from '@/components/rich-text-editor';
import { getZodFieldErrors } from '@/lib/format-zod-error';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
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
import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
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
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { queryKeys } from '@/hooks/query-keys';
import { hasCourseRunPricing } from '@/lib/course-run-pricing';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { coursesApi } from '@/services/courses/courses-api';
import { programsApi } from '@/services/programs/programs-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseResponse } from '@/services/types/domain';

const schema = z.object({
  code: z.string().trim().min(2, 'Code must be at least 2 characters'),
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  orderIndex: z.number().int().min(0, 'Order must be >= 0'),
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
  useAdminPageMeta(ADMIN_PAGE_META.courses);

  const { programId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isProgramScope = Boolean(programId);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CourseResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedCourse, setSelectedCourse] = useState<CourseResponse | null>(null);

  const programQuery = useQuery({
    queryKey: queryKeys.programs.detail(programId ?? ''),
    queryFn: () => programsApi.getById(programId!),
    enabled: isProgramScope,
  });

  const coursesQuery = useQuery({
    queryKey: [...queryKeys.courses.list(programId), page],
    queryFn: () =>
      isProgramScope
        ? coursesApi.getPage(page, ADMIN_LIST_PAGE_SIZE, programId)
        : coursesApi.getPage(page, ADMIN_LIST_PAGE_SIZE),
  });

  const filteredCourses = useMemo(() => {
    const rows = coursesQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (course) =>
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        (course.programCode ?? '').toLowerCase().includes(q),
    );
  }, [coursesQuery.data?.data, search]);

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
          programId: 'Select a program.',
        }));
        throw new Error('Missing program.');
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
      toast.success(editing ? 'Course updated.' : 'Course created.');
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
      toast.success('Course deleted.');
      setDeleteTarget(null);
      setSelectedCourse(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const initialForm: FormState = editing
    ? {
        code: editing.code,
        title: editing.title,
        description: editing.description ?? '',
        orderIndex: editing.orderIndex,
        thumbnailFile: null,
        programId: editing.programId,
      }
    : { ...emptyForm, programId: programId ?? '' };

  const isDirty =
    dialogOpen &&
    (form.code !== initialForm.code ||
      form.title !== initialForm.title ||
      form.description !== initialForm.description ||
      form.orderIndex !== initialForm.orderIndex ||
      form.programId !== initialForm.programId ||
      form.thumbnailFile !== null);

  useBeforeUnload(dialogOpen && isDirty);

  const requiredFilled =
    form.code.trim().length > 0 &&
    form.title.trim().length > 0 &&
    Boolean(editing?.programId ?? programId ?? form.programId);

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !confirmDiscard(isDirty)) {
      return;
    }
    setDialogOpen(open);
  };

  const openCreateDialog = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      programId: programId ?? '',
    });
    setFieldErrors({});
    setDialogOpen(true);
  };

  const clearSelectedCourse = () => setSelectedCourse(null);

  const rows = coursesQuery.data?.data ?? [];
  const selectedLiveCourse =
    (selectedCourse && rows.find((c) => c.id === selectedCourse.id)) || selectedCourse;
  const dockModalOpen = Boolean(deleteTarget) || dialogOpen;
  const dockOpen = Boolean(selectedLiveCourse) && !dockModalOpen;

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
      { accessorKey: 'code', header: 'Code' },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="max-w-[22rem] font-medium break-words whitespace-normal">
            {row.original.title}
          </div>
        ),
      },
      {
        accessorKey: 'courseRuns',
        header: 'Runs',
        cell: ({ row }) => row.original.courseRuns?.length ?? 0,
      },
      {
        id: 'setup',
        header: 'Setup progress',
        cell: ({ row }) => {
          const lessons = row.original.syllabusSections?.reduce(
            (count, section) => count + (section.items?.length ?? 0),
            0,
          );
          const paidRuns =
            row.original.courseRuns?.filter((run) => hasCourseRunPricing(run.metadata)).length ?? 0;
          return (
            <div className="space-y-1 text-sm">
              <p>{lessons ?? 0} lessons</p>
              <p className="text-muted-foreground">
                {paidRuns} paid / {row.original.courseRuns?.length ?? 0} runs
              </p>
            </div>
          );
        },
      },
    ];

    if (!isProgramScope) {
      base.splice(2, 0, {
        id: 'program',
        header: 'Program',
        cell: ({ row }) => (
          <span className="truncate">{row.original.programCode ?? row.original.programId.slice(0, 8)}</span>
        ),
      });
    }

    return base;
  }, [isProgramScope]);

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title={
        isProgramScope
          ? `Courses — ${programQuery.data?.title ?? '...'}`
          : 'Courses'
      }
      description={
        isProgramScope
          ? `Manage courses for program ${programQuery.data?.code ?? ''}.`
          : 'Select a row to preview in the dock, then open the workspace or edit.'
      }
      actions={
        <Button size="sm" onClick={openCreateDialog} disabled={saveMutation.isPending}>
          <Plus className="mr-2 size-4" />
          Add course
        </Button>
      }
      toolbar={
        <div className="flex w-full flex-col gap-3">
          {isProgramScope ? (
            <Button variant="ghost" size="sm" className="self-start" asChild>
              <Link to={ROUTES.programs}>
                <ArrowLeft className="mr-2 size-4" />
                Back to programs
              </Link>
            </Button>
          ) : null}
          <AdminFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by code, title, or program"
            showClear={search.trim().length > 0}
            onClear={() => setSearch('')}
          />
        </div>
      }
    >
      {coursesQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(coursesQuery.error)}
          onRetry={() => void coursesQuery.refetch()}
        />
      ) : (
        <>
          <AdminDockLayout dockOpen={dockOpen}>
            <div className="space-y-4">
              <DataTable
                columns={columns}
                data={filteredCourses}
                isLoading={coursesQuery.isLoading}
                showRowIndex
                pageOffset={page * ADMIN_LIST_PAGE_SIZE}
                emptyMessage='No courses yet. Click "Add course" to create one.'
                showPagination={false}
                activeRowId={selectedLiveCourse?.id ?? null}
                getRowId={(row) => row.id}
                onRowClick={setSelectedCourse}
              />

              <ServerPagination
                page={page}
                totalPages={coursesQuery.data?.totalPages ?? 1}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  clearSelectedCourse();
                }}
              />
            </div>
          </AdminDockLayout>

          <AdminDockPanel
            open={dockOpen}
            onClose={clearSelectedCourse}
            title={selectedLiveCourse?.title ?? 'Course'}
            description={
              selectedLiveCourse
                ? `${selectedLiveCourse.code}${selectedLiveCourse.programCode ? ` · ${selectedLiveCourse.programCode}` : ''}`
                : undefined
            }
            footer={
              selectedLiveCourse ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2.5"
                    onClick={() => openEditDialog(selectedLiveCourse)}
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructiveOutline"
                    size="sm"
                    className="px-2.5"
                    onClick={() => setDeleteTarget(selectedLiveCourse)}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    className="px-2.5"
                    onClick={() => navigate(ROUTES.courseDetail(selectedLiveCourse.id))}
                  >
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Go to manage
                  </Button>
                </>
              ) : null
            }
          >
            {selectedLiveCourse ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InspectorField label="Code" value={selectedLiveCourse.code} />
                <InspectorField
                  label="Program"
                  value={selectedLiveCourse.programCode ?? '—'}
                />
                <InspectorField
                  label="Title"
                  value={selectedLiveCourse.title}
                  className="col-span-2"
                />
                <InspectorField
                  label="Runs"
                  value={String(selectedLiveCourse.courseRuns?.length ?? 0)}
                />
                <InspectorField
                  label="Order"
                  value={String(selectedLiveCourse.orderIndex)}
                />
              </dl>
            ) : null}
          </AdminDockPanel>
        </>
      )}

      <AdminEditorDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        title={editing ? 'Edit course' : 'Add course'}
        description={
          !editing
            ? isProgramScope && programQuery.data
              ? `Adding a course to program ${programQuery.data.code} — ${programQuery.data.title}. After creation, you will be taken to the Syllabus tab to add lessons.`
              : 'After creation, you will be taken to the Syllabus tab to add lessons.'
            : undefined
        }
        size="xl"
        footer={
          <AdminFormDialogFooter
            onCancel={() => handleDialogOpenChange(false)}
            submitLabel="Save"
            onSubmit={() => saveMutation.mutate()}
            pending={saveMutation.isPending}
            disabled={!requiredFilled}
          />
        }
      >
        <div className="space-y-4">
            {isProgramScope && (programQuery.data || editing) ? (
              <div className="space-y-2">
                <Label>Program</Label>
                <p className="text-sm">
                  {programQuery.data
                    ? `${programQuery.data.code} — ${programQuery.data.title}`
                    : `${editing?.programCode ?? editing?.programId ?? ''}`}
                </p>
              </div>
            ) : null}
            {!isProgramScope && !editing ? (
              <div className="space-y-2">
                <Label>
                  Program <span className="text-destructive">*</span>
                </Label>
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
                    <SelectValue placeholder="Select program" />
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
                <Label>Program</Label>
                <p className="text-sm">{editing.programCode ?? editing.programId}</p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Code <span className="text-destructive">*</span>
                </Label>
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
                <Label>Order</Label>
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
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
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
              <Label>Description</Label>
              <RichTextEditor
                value={form.description}
                minHeight="10rem"
                placeholder="Enter a short course description"
                onChange={(description) =>
                  setForm((f) => ({ ...f, description }))
                }
              />
            </div>
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <ImageFilePicker
              file={form.thumbnailFile}
              existingUrl={editing?.thumbnailUrl}
              previewAlt={form.title || 'Course thumbnail'}
              onFileChange={(thumbnailFile) =>
                setForm((f) => ({ ...f, thumbnailFile }))
              }
            />
          </div>
        </div>
      </AdminEditorDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.title}&quot;
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
    </AdminPageShell>
  );
}
