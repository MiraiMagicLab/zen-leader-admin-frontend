import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import type { CourseRunResponse } from '@/services/types/domain';

export function CourseRunsListPage() {
  const runsQuery = useQuery({
    queryKey: queryKeys.courseRuns.list(),
    queryFn: () => courseRunsApi.getAll(),
  });

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
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.courseRunDetail(row.original.id)}>Chi tiết</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Lớp chạy"
        description="Danh sách tất cả course run trong hệ thống."
      />
      <DataTable
        columns={columns}
        data={runsQuery.data ?? []}
        isLoading={runsQuery.isLoading}
      />
    </div>
  );
}
