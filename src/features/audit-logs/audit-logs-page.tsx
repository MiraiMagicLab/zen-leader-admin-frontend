import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw, Search } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
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
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  auditActionLabel,
  auditEntityTypeLabel,
} from '@/lib/audit-labels';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import type { AuditLogResponse } from '@/services/types/domain';

const ALL = 'all';

export function AuditLogsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.auditLogs);

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
        header: 'Time',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => auditActionLabel(row.original.action),
      },
      {
        accessorKey: 'entityType',
        header: 'Entity type',
        cell: ({ row }) => auditEntityTypeLabel(row.original.entityType),
      },
      { accessorKey: 'entityId', header: 'Entity ID' },
      {
        accessorKey: 'actorDisplay',
        header: 'Actor',
        cell: ({ row }) => row.original.actorDisplay ?? row.original.actorUserId ?? '—',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Review administrative actions and data changes across the platform."
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
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
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
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
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
              placeholder="Filter by actor user ID"
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
              Apply filter
            </Button>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="mr-2 size-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>

        {hasActiveFilters ? (
          <p className="text-muted-foreground text-sm">
            Filters:
            {action !== ALL ? ` ${auditActionLabel(action)}` : ''}
            {entityType !== ALL ? ` · ${auditEntityTypeLabel(entityType)}` : ''}
            {actorUserId ? ` · User ${actorUserId}` : ''}
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
        emptyMessage="No matching audit records."
      />

      <ServerPagination
        page={page}
        totalPages={auditQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
        pageBase={1}
      />
    </div>
  );
}
