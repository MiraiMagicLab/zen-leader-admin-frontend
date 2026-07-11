import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, RotateCcw } from 'lucide-react';

import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { FilterChipGroup } from '@/components/admin/filter-chip-group';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  auditActionLabel,
  auditActorTypeLabel,
  auditEntityTypeLabel,
} from '@/lib/audit-labels';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import type { AuditLogResponse } from '@/services/types/domain';

const ALL = 'all';
const PAGE_SIZE = 20;

const ACTION_FILTER_OPTIONS = [
  { value: ALL, label: 'All' },
  ...AUDIT_ACTION_OPTIONS,
] as const;

const ENTITY_TYPE_FILTER_OPTIONS = [
  { value: ALL, label: 'All' },
  ...AUDIT_ENTITY_TYPE_OPTIONS,
] as const;

export function AuditLogsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.auditLogs);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [actorUserIdInput, setActorUserIdInput] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setActorUserId(actorUserIdInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [actorUserIdInput]);

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


  const clearSelectedLog = () => setSelectedLog(null);

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
      variant="list"
      density="compact"
      title="Audit log"
      description="Review administrative actions across the platform. Select a row to inspect."
      actions={
        <Button variant="outline" size="sm" onClick={() => void auditQuery.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      }
      toolbar={
        <AdminFilterBar
          searchValue={actorUserIdInput}
          onSearchChange={setActorUserIdInput}
          searchPlaceholder="Filter by actor user ID"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={resetFilters}
        >
          <FilterChipGroup
            ariaLabel="Audit action"
            value={action}
            options={ACTION_FILTER_OPTIONS}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
          />
          <FilterChipGroup
            ariaLabel="Entity type"
            value={entityType}
            options={ENTITY_TYPE_FILTER_OPTIONS}
            onChange={(value) => {
              setEntityType(value);
              setPage(1);
            }}
          />
        </AdminFilterBar>
      }
    >
      <>
        <AdminDockLayout dockOpen={Boolean(selectedLog)}>
          <div className="space-y-3">
            {auditQuery.isError ? (
              <AdminQueryError
                message={getApiErrorMessage(auditQuery.error)}
                onRetry={() => void auditQuery.refetch()}
              />
            ) : null}

            {hasActiveFilters ? (
              <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
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
              activeRowId={selectedLog?.id ?? null}
              getRowId={(row) => row.id}
              onRowClick={setSelectedLog}
            />

            <ServerPagination
              page={page}
              totalPages={auditQuery.data?.totalPages ?? 1}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                clearSelectedLog();
              }}
              pageBase={1}
            />
          </div>
        </AdminDockLayout>

        <AdminDockPanel
          open={Boolean(selectedLog)}
          onClose={clearSelectedLog}
          title="Audit log detail"
          description={selectedLog ? `Log ${selectedLog.id.slice(0, 8)}…` : undefined}
        >
          {selectedLog ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InspectorField label="Action" value={auditActionLabel(selectedLog.action)} />
                <InspectorField label="Entity type" value={auditEntityTypeLabel(selectedLog.entityType)} />
                <InspectorField label="Entity ID" value={selectedLog.entityId} mono className="col-span-2" />
                <InspectorField
                  label="Actor"
                  value={selectedLog.actorDisplay ?? selectedLog.actorUserId}
                />
                <InspectorField label="Actor type" value={auditActorTypeLabel(selectedLog.actorType)} />
                <InspectorField label="Actor user ID" value={selectedLog.actorUserId} mono />
                <InspectorField label="Request ID" value={selectedLog.requestId} mono />
                <InspectorField label="IP address" value={selectedLog.ipAddress} mono />
                <InspectorField
                  label="User agent"
                  value={selectedLog.userAgent}
                  className="col-span-2"
                />
                <InspectorField label="Timestamp" value={formatDateTime(selectedLog.createdAt)} />
              </dl>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Metadata</p>
                <pre className="bg-muted/40 max-h-96 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap break-words">
                  {selectedLog.metadata ? JSON.stringify(selectedLog.metadata, null, 2) : '—'}
                </pre>
              </div>
            </div>
          ) : null}
        </AdminDockPanel>
      </>
    </AdminPageShell>
  );
}
