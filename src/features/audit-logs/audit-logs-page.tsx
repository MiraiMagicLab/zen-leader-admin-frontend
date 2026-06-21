import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import type { AuditLogResponse } from '@/services/types/domain';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [filters, setFilters] = useState({ action: '', entityType: '', actorUserId: '' });

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ page, ...filters }),
    queryFn: () =>
      auditLogsApi.getAll({
        page,
        size: 20,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        actorUserId: filters.actorUserId || undefined,
      }),
  });

  const columns = useMemo<ColumnDef<AuditLogResponse>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      { accessorKey: 'action', header: 'Hành động' },
      { accessorKey: 'entityType', header: 'Loại entity' },
      { accessorKey: 'entityId', header: 'Entity ID' },
      {
        accessorKey: 'actorDisplay',
        header: 'Người thực hiện',
        cell: ({ row }) => row.original.actorDisplay ?? row.original.actorUserId ?? '—',
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Audit log"
        description="Theo dõi thao tác quản trị và thay đổi dữ liệu."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label>Action</Label>
          <Input value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Entity type</Label>
          <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Actor user ID</Label>
          <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => {
              setPage(1);
              setFilters({ action, entityType, actorUserId });
            }}
          >
            Lọc
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={auditQuery.data?.data ?? []}
        isLoading={auditQuery.isLoading}
        pageSize={20}
        showRowIndex
        pageOffset={(page - 1) * 20}
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trang trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= (auditQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  );
}
