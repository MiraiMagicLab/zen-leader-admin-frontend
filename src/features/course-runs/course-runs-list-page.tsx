import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Search } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
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
import type { CourseRunResponse } from '@/services/types/domain';

const STATUS_OPTIONS = ['all', 'DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function CourseRunsListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const runsQuery = useQuery({
    queryKey: [...queryKeys.courseRuns.list(), page],
    queryFn: () => courseRunsApi.getPage(page, 20),
  });

  const filteredData = useMemo(() => {
    const data = runsQuery.data?.data ?? [];
    return data.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          run.code.toLowerCase().includes(q) ||
          run.courseId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [runsQuery.data, statusFilter, search]);

  const columns = useMemo<ColumnDef<CourseRunResponse>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã lớp' },
      { accessorKey: 'courseId', header: 'Course ID' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'startsAt',
        header: 'Bắt đầu',
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        accessorKey: 'endsAt',
        header: 'Kết thúc',
        cell: ({ row }) => formatDateTime(row.original.endsAt),
      },
      {
        accessorKey: 'capacity',
        header: 'Sức chứa',
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
                <Link to={ROUTES.courseRunDetail(row.original.id)}>Chi tiết</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Đợt học"
        description="Danh sách tất cả đợt học trong hệ thống."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Tìm theo mã lớp hoặc courseId…"
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
                {s === 'all' ? 'Tất cả trạng thái' : s}
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
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Trang trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= (runsQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  );
}
