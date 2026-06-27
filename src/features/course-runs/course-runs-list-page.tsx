import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActions, tableActionsColumn } from '@/components/admin/table-row-actions';
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
import { Input } from '@/components/ui/input';
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
  COURSE_RUN_STATUS_OPTIONS,
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

const STATUS_OPTIONS = ['all', ...COURSE_RUN_STATUS_OPTIONS];

export function CourseRunsListPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseRuns);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseRunResponse | null>(null);

  const runsQuery = useQuery({
    queryKey: [...queryKeys.courseRuns.list(), page],
    queryFn: () => courseRunsApi.getPage(page, ADMIN_LIST_PAGE_SIZE),
  });

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.getPage(0, 200),
  });

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of coursesQuery.data?.data ?? []) {
      map.set(course.id, `${course.code} — ${course.title}`);
    }
    return map;
  }, [coursesQuery.data]);

  const filteredData = useMemo(() => {
    const data = runsQuery.data?.data ?? [];
    return data.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const courseLabel = courseTitleById.get(run.courseId) ?? run.courseId;
        return (
          run.code.toLowerCase().includes(q) ||
          run.courseId.toLowerCase().includes(q) ||
          courseLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courseTitleById, runsQuery.data, search, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseRunsApi.remove(id),
    onSuccess: () => {
      toast.success('Course run deleted.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<CourseRunResponse>[]>(
    () => [
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
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        ...tableActionsColumn<CourseRunResponse>(),
        cell: ({ row }) => (
          <TableRowActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.courseRunDetail(row.original.id))}
            >
              Open
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive size-8"
              aria-label="Delete course run"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [courseTitleById, navigate],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Course runs"
        description="Manage course runs: schedule, pricing, and enrollment windows."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add course run
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by class code or course"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all' ? 'All statuses' : courseRunStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={runsQuery.isLoading}
        showRowIndex
        pageOffset={page * ADMIN_LIST_PAGE_SIZE}
        emptyMessage='No course runs yet. Click "Add course run" to create one.'
        showPagination={false}
      />

      <ServerPagination
        page={page}
        totalPages={runsQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

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
    </div>
  );
}
