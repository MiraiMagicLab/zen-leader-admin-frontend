import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
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
import { formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { safetyApi } from '@/services/safety/safety-api';
import type { UgcReportResponse } from '@/services/types/domain';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'DISMISSED', label: 'Bỏ qua' },
];

export function ModerationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearchKeyword(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const reportsQuery = useQuery({
    queryKey: queryKeys.safety.reports(page, statusFilter, searchKeyword),
    queryFn: () =>
      safetyApi.listReports(
        page,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
        searchKeyword || undefined,
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: string }) =>
      safetyApi.updateReportStatus(reportId, status),
    onSuccess: () => {
      toast.success('Đã cập nhật báo cáo.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.safety.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<UgcReportResponse>[]>(
    () => [
      {
        accessorKey: 'reason',
        header: 'Lý do',
        cell: ({ row }) => (
          <div className="max-w-xs">
            <p className="font-medium">{row.original.reason}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.targetContentType} · {row.original.targetContentId}
            </p>
          </div>
        ),
      },
      {
        id: 'reporter',
        header: 'Người báo cáo',
        cell: ({ row }) => (
          <div>
            <p>{row.original.reporterDisplayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.reporterEmail}</p>
          </div>
        ),
      },
      {
        id: 'target',
        header: 'Đối tượng',
        cell: ({ row }) => row.original.targetUserDisplayName,
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    reportId: row.original.id,
                    status: 'RESOLVED',
                  })
                }
              >
                Xử lý
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    reportId: row.original.id,
                    status: 'DISMISSED',
                  })
                }
              >
                Bỏ qua
              </Button>
            </div>
          ) : null,
      },
    ],
    [updateStatusMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Kiểm duyệt"
        description="Xử lý báo cáo nội dung người dùng (UGC)."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reportsQuery.refetch()}
            >
              <RefreshCw className="mr-2 size-4" />
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Tìm theo lý do, người báo cáo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={reportsQuery.data?.data ?? []}
        isLoading={reportsQuery.isLoading}
        emptyMessage="Không có báo cáo nào."
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
          disabled={page + 1 >= (reportsQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  );
}
