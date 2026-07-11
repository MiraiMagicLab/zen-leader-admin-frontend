import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import {
  AdminDockLayout,
  AdminDockPanel,
  AdminDockStatRow,
} from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActionMenu, tableActionsColumn } from '@/components/admin/table-row-actions';
import { CreateCourseRunSheet } from '@/features/course-runs/components/create-course-run-sheet';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatCourseRunPricingSummary, hasCourseRunPricing } from '@/lib/course-run-pricing';
import {
  courseRunStatusClasses,
  courseRunStatusLabel,
} from '@/lib/course-run-status';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseRunResponse } from '@/services/types/domain';

export function CourseRunsListPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseRuns);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [courseFilter, setCourseFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseRunResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedRun, setSelectedRun] = useState<CourseRunResponse | null>(null);

  const selectRun = useCallback((run: CourseRunResponse) => {
    setSelectedRun(run);
  }, []);

  const clearSelectedRun = useCallback(() => {
    setSelectedRun(null);
  }, []);

  const runsQuery = useQuery({
    queryKey: [...queryKeys.courseRuns.list(), page, courseFilter],
    queryFn: () =>
      courseRunsApi.getPage(
        page,
        ADMIN_LIST_PAGE_SIZE,
        courseFilter === 'all' ? undefined : courseFilter,
      ),
  });

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.getAll(),
    staleTime: 60_000,
  });

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of coursesQuery.data ?? []) {
      map.set(course.id, `${course.code} — ${course.title}`);
    }
    return map;
  }, [coursesQuery.data]);

  const tableData = runsQuery.data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseRunsApi.remove(id),
    onSuccess: () => {
      toast.success('Course run deleted.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(error),
  });

  const visibleIds = useMemo(
    () => tableData.map((run) => run.id),
    [tableData],
  );

  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)).length,
    [visibleIds, selectedIds],
  );

  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        }
        return next;
      });
    },
    [visibleIds],
  );

  const runBulkDelete = async () => {
    const ids = visibleIds.filter((id) => selectedIds.has(id));
    if (ids.length === 0) {
      return;
    }
    setBulkDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => courseRunsApi.remove(id)));
    setBulkDeleting(false);
    const failed = results.filter((result) => result.status === 'rejected').length;
    const succeeded = ids.length - failed;
    if (succeeded > 0) {
      toast.success(`Deleted ${succeeded} course run${succeeded === 1 ? '' : 's'}.`);
    }
    if (failed > 0) {
      toast.error(`Could not delete ${failed} course run${failed === 1 ? '' : 's'}.`);
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
  };

  const columns = useMemo<ColumnDef<CourseRunResponse>[]>(
    () => [
      {
        id: 'select',
        size: 40,
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <Checkbox
            checked={allVisibleSelected}
            aria-label="Select all course runs on this page"
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => toggleAllVisible(value === true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            aria-label={`Select course run ${row.original.code}`}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => toggleOne(row.original.id, value === true)}
          />
        ),
      },
      { accessorKey: 'code', header: 'Class code' },
      {
        id: 'course',
        header: 'Course',
        cell: ({ row }) => {
          const label = courseTitleById.get(row.original.courseId);
          if (!label) {
            return (
              <span className="text-muted-foreground text-sm">
                {row.original.courseId.slice(0, 8)}…
              </span>
            );
          }
          return (
            <Button
              variant="link"
              className="h-auto max-w-[18rem] truncate p-0"
              asChild
              onClick={(event) => event.stopPropagation()}
            >
              <Link to={ROUTES.courseDetail(row.original.courseId, 'runs')}>{label}</Link>
            </Button>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              courseRunStatusClasses(row.original.status),
            )}
          >
            {courseRunStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'pricing',
        header: 'Price',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) =>
          hasCourseRunPricing(row.original.metadata) ? (
            <Badge>{formatCourseRunPricingSummary(row.original.metadata) || 'Paid'}</Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          ),
      },
      {
        accessorKey: 'startsAt',
        header: 'Starts',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        ...tableActionsColumn<CourseRunResponse>(),
        cell: ({ row }) => (
          <TableRowActionMenu
            items={[
              {
                label: 'Open',
                onClick: () => navigate(ROUTES.courseRunDetail(row.original.id)),
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onClick: () => setDeleteTarget(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [allVisibleSelected, courseTitleById, navigate, selectedIds, toggleAllVisible, toggleOne],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Course runs"
      description="Manage schedules, pricing, and enrollment windows. Select a row to preview in the dock."
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add course run
        </Button>
      }
      toolbar={
        <AdminFilterBar
          trailing={
            selectedVisibleCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete selected ({selectedVisibleCount})
              </Button>
            ) : null
          }
          showClear={courseFilter !== 'all'}
          onClear={() => {
            setCourseFilter('all');
            setPage(0);
          }}
        >
          <Select
            value={courseFilter}
            onValueChange={(value) => {
              setCourseFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {(coursesQuery.data ?? []).map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AdminFilterBar>
      }
    >
      {runsQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(runsQuery.error)}
          onRetry={() => void runsQuery.refetch()}
        />
      ) : (
        <>
          <AdminDockLayout dockOpen={Boolean(selectedRun) && !deleteTarget && !bulkDeleteOpen}>
            <div className="space-y-3">
              {!selectedRun && tableData.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Click a row to preview details in the floating panel.
                </p>
              ) : null}

              <DataTable
                columns={columns}
                data={tableData}
                isLoading={runsQuery.isLoading}
                showRowIndex
                pageOffset={page * ADMIN_LIST_PAGE_SIZE}
                emptyMessage='No course runs yet. Click "Add course run" to create one.'
                showPagination={false}
                activeRowId={selectedRun?.id ?? null}
                getRowId={(row) => row.id}
                onRowClick={selectRun}
              />

              <ServerPagination
                page={page}
                totalPages={runsQuery.data?.totalPages ?? 1}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  clearSelectedRun();
                }}
              />
            </div>
          </AdminDockLayout>

          <AdminDockPanel
            open={Boolean(selectedRun) && !deleteTarget && !bulkDeleteOpen}
            onClose={clearSelectedRun}
            title={selectedRun?.code ?? 'Course run'}
            description={
              selectedRun
                ? courseTitleById.get(selectedRun.courseId) ?? 'Course run details'
                : undefined
            }
            footer={
              selectedRun ? (
                <>
                  <Button variant="ghost" size="sm" onClick={clearSelectedRun}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(ROUTES.courseRunDetail(selectedRun.id))}
                  >
                    Open workspace
                  </Button>
                </>
              ) : null
            }
          >
            {selectedRun ? (
              <div className="space-y-1 divide-y">
                <AdminDockStatRow
                  label="Status"
                  value={courseRunStatusLabel(selectedRun.status)}
                />
                <AdminDockStatRow
                  label="Pricing"
                  value={
                    hasCourseRunPricing(selectedRun.metadata)
                      ? formatCourseRunPricingSummary(selectedRun.metadata) || 'Paid'
                      : 'Free'
                  }
                />
                <AdminDockStatRow
                  label="Schedule"
                  value={formatDateTime(selectedRun.startsAt)}
                  hint={
                    selectedRun.endsAt
                      ? `Ends ${formatDateTime(selectedRun.endsAt)}`
                      : undefined
                  }
                />
                <div className="space-y-3 pt-3">
                  <InspectorField label="Course run ID" value={selectedRun.id} mono />
                  <InspectorField label="Course ID" value={selectedRun.courseId} mono />
                  <InspectorField
                    label="Enrollment window"
                    value={`${formatDateTime(selectedRun.enrollmentStartDate)} → ${formatDateTime(selectedRun.enrollmentEndDate)}`}
                  />
                </div>
              </div>
            ) : null}
          </AdminDockPanel>
        </>
      )}

      <CreateCourseRunSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => void navigate(ROUTES.courseRunDetail(created.id))}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course run?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete course run &quot;{deleteTarget?.code}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!bulkDeleting) {
            setBulkDeleteOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVisibleCount} course runs?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedVisibleCount} selected course run
              {selectedVisibleCount === 1 ? '' : 's'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
              onClick={(event) => {
                event.preventDefault();
                void runBulkDelete();
              }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
