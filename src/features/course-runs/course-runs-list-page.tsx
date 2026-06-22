import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Plus, Search } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { CreateCourseRunSheet } from '@/features/course-runs/components/create-course-run-sheet';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import type { CourseRunResponse } from '@/services/types/domain';

const STATUS_OPTIONS = ['all', 'DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function CourseRunsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const runsQuery = useQuery({
    queryKey: [...queryKeys.courseRuns.list(), page],
    queryFn: () => courseRunsApi.getPage(page, 20),
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
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
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
  }, [runsQuery.data, statusFilter, search, courseTitleById]);

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
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to={ROUTES.courseDetail(row.original.courseId, 'runs')}>{label}</Link>
            </Button>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'startsAt',
        header: 'Start',
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        accessorKey: 'endsAt',
        header: 'End',
        cell: ({ row }) => formatDateTime(row.original.endsAt),
      },
      {
        accessorKey: 'capacity',
        header: 'Capacity',
        cell: ({ row }) => row.original.capacity ?? '—',
      },
      {
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
                <Link to={ROUTES.courseRunDetail(row.original.id)}>Details</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [courseTitleById],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Course Runs"
        description="All course runs. Create new or open details to manage sessions and enrollment."
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
            placeholder="Search by class code or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
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
        pageOffset={page * 20}
        emptyMessage='No course runs yet. Click "Add course run" to create one.'
        showPagination={false}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous page
        </Button>
        <span className="text-muted-foreground text-sm">
          Page {page + 1} / {runsQuery.data?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= (runsQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page
        </Button>
      </div>

      <CreateCourseRunSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => void navigate(ROUTES.courseRunDetail(created.id))}
      />
    </div>
  );
}
