import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';

import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { AdminInspector, InspectorField } from '@/components/admin/admin-inspector';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
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
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import type { AuditLogResponse } from '@/services/types/domain';

const ALL = 'all';
const PAGE_SIZE = 20;

export function AuditLogsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.auditLogs);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [actorUserIdInput, setActorUserIdInput] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [inspectorLog, setInspectorLog] = useState<AuditLogResponse | null>(null);

  const hasActiveFilters =
    action !== ALL || entityType !== ALL || Boolean(actorUserId.trim());

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ page, action, entityType, actorUserId }),
    queryFn: () =>
      auditLogsApi.getAll({
        page,
        size: PAGE_SIZE,
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
    <AdminPageShell
      title="Audit log"
      description="Review administrative actions and data changes across the platform."
      toolbar={
        <AdminFilterBar
          searchValue={actorUserIdInput}
          onSearchChange={setActorUserIdInput}
          searchPlaceholder="Filter by actor user ID"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={resetFilters}
          trailing={
            <Button variant="secondary" size="sm" onClick={applyActorFilter}>
              Apply filter
            </Button>
          }
        >
          <Select
            value={action}
            onValueChange={(value) => {
              setAction(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
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

          <Select
            value={entityType}
            onValueChange={(value) => {
              setEntityType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
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
        </AdminFilterBar>
      }
    >
      <div className="flex flex-col gap-6">
        {auditQuery.isError ? (
          <AdminQueryError
            message={getApiErrorMessage(auditQuery.error)}
            onRetry={() => void auditQuery.refetch()}
          />
        ) : null}

        {hasActiveFilters ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <RotateCcw className="size-3.5" />
            Filters:
            {action !== ALL ? ` ${auditActionLabel(action)}` : ''}
            {entityType !== ALL ? ` · ${auditEntityTypeLabel(entityType)}` : ''}
            {actorUserId ? ` · User ${actorUserId}` : ''}
          </p>
        ) : null}

        <DataTable
          columns={columns}
          data={auditQuery.data?.data ?? []}
          isLoading={auditQuery.isLoading}
          showRowIndex
          pageOffset={(page - 1) * PAGE_SIZE}
          showPagination={false}
          emptyMessage="No matching audit records."
          onRowClick={setInspectorLog}
        />

        <ServerPagination
          page={page}
          totalPages={auditQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
          pageBase={1}
        />
      </div>

      <AdminInspector
        open={Boolean(inspectorLog)}
        onOpenChange={(open) => {
          if (!open) setInspectorLog(null);
        }}
        title="Audit log detail"
        description={inspectorLog ? `Log ${inspectorLog.id.slice(0, 8)}…` : undefined}
        size="lg"
      >
        {inspectorLog ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <InspectorField label="Action" value={auditActionLabel(inspectorLog.action)} />
              <InspectorField label="Entity type" value={auditEntityTypeLabel(inspectorLog.entityType)} />
              <InspectorField label="Entity ID" value={inspectorLog.entityId} mono className="col-span-2" />
              <InspectorField
                label="Actor"
                value={inspectorLog.actorDisplay ?? inspectorLog.actorUserId}
              />
              <InspectorField label="Actor type" value={inspectorLog.actorType} />
              <InspectorField label="Actor user ID" value={inspectorLog.actorUserId} mono />
              <InspectorField label="Request ID" value={inspectorLog.requestId} mono />
              <InspectorField label="IP address" value={inspectorLog.ipAddress} mono />
              <InspectorField
                label="User agent"
                value={inspectorLog.userAgent}
                className="col-span-2"
              />
              <InspectorField label="Timestamp" value={formatDateTime(inspectorLog.createdAt)} />
            </dl>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Metadata
              </dt>
              <pre className="bg-muted/50 max-h-96 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap break-words">
                {inspectorLog.metadata ? JSON.stringify(inspectorLog.metadata, null, 2) : '—'}
              </pre>
            </div>
          </div>
        ) : null}
      </AdminInspector>
    </AdminPageShell>
  );
}
