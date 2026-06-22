import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw, Search } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
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
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  auditActionLabel,
  auditEntityTypeLabel,
} from '@/lib/audit-labels';
import { formatDateTime } from '@/lib/format';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import type { AuditLogResponse } from '@/services/types/domain';

const ALL = 'all';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [actorUserIdInput, setActorUserIdInput] = useState('');
  const [actorUserId, setActorUserId] = useState('');

  const hasActiveFilters =
    action !== ALL || entityType !== ALL || Boolean(actorUserId.trim());

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ page, action, entityType, actorUserId }),
    queryFn: () =>
      auditLogsApi.getAll({
        page,
        size: 20,
        action: action === ALL ? undefined : action,
        entityType: entityType === ALL ? undefined : entityType,
        actorUserId: actorUserId.trim() || undefined,
      }),
  });

  const applyActorFilter = () => {
    setPage(1);
    setActorUserId(actorUserIdInput.trim());
  };

  const resetFilters = () => {
    setPage(1);
    setAction(ALL);
    setEntityType(ALL);
    setActorUserIdInput('');
    setActorUserId('');
  };

  const columns = useMemo<ColumnDef<AuditLogResponse>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'action',
        header: 'Hành động',
        cell: ({ row }) => auditActionLabel(row.original.action),
      },
      {
        accessorKey: 'entityType',
        header: 'Loại đối tượng',
        cell: ({ row }) => auditEntityTypeLabel(row.original.entityType),
      },
      { accessorKey: 'entityId', header: 'ID đối tượng' },
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
        title="Nhật ký audit"
        description="Theo dõi thao tác quản trị và thay đổi dữ liệu trên hệ thống."
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[200px] flex-1 sm:max-w-xs">
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hành động" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả hành động</SelectItem>
                {AUDIT_ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full min-w-[200px] flex-1 sm:max-w-xs">
            <Select
              value={entityType}
              onValueChange={(value) => {
                setEntityType(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Loại đối tượng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả loại</SelectItem>
                {AUDIT_ENTITY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="ID người thực hiện…"
              value={actorUserIdInput}
              onChange={(event) => setActorUserIdInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyActorFilter();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={applyActorFilter}>
              Lọc người dùng
            </Button>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="mr-2 size-4" />
                Xóa lọc
              </Button>
            ) : null}
          </div>
        </div>

        {hasActiveFilters ? (
          <p className="text-muted-foreground text-sm">
            Đang lọc:
            {action !== ALL ? ` ${auditActionLabel(action)}` : ''}
            {entityType !== ALL ? ` · ${auditEntityTypeLabel(entityType)}` : ''}
            {actorUserId ? ` · Người dùng ${actorUserId}` : ''}
          </p>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={auditQuery.data?.data ?? []}
        isLoading={auditQuery.isLoading}
        showRowIndex
        pageOffset={(page - 1) * 20}
        showPagination={false}
        emptyMessage="Không có bản ghi audit phù hợp."
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trang trước
        </Button>
        <span className="text-muted-foreground text-sm">
          Trang {page} / {auditQuery.data?.totalPages ?? 1}
        </span>
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
