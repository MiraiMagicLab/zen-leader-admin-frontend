import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, RotateCcw } from 'lucide-react';

import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { FilterChipGroup } from '@/components/admin/filter-chip-group';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { TechnicalDetails } from '@/components/admin/technical-details';
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
        header: 'Target',
        cell: ({ row }) => auditEntityTypeLabel(row.original.entityType),
      },
      {
        accessorKey: 'actorDisplay',
        header: 'Actor',
        cell: ({ row }) =>
          row.original.actorDisplay ??
          (row.original.actorUserId ? 'System user' : 'System'),
      },
    ],
    [],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Audit log"
      description="Review who changed what across the platform. Select a row for more context."
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
          searchPlaceholder="Filter by actor reference (advanced)"
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
          title={selectedLog ? auditActionLabel(selectedLog.action) : 'Audit detail'}
          description={
            selectedLog
              ? `${auditEntityTypeLabel(selectedLog.entityType)} · ${formatDateTime(selectedLog.createdAt)}`
              : undefined
          }
        >
          {selectedLog ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InspectorField label="Action" value={auditActionLabel(selectedLog.action)} />
                <InspectorField
                  label="Target type"
                  value={auditEntityTypeLabel(selectedLog.entityType)}
                />
                <InspectorField
                  label="Actor"
                  value={selectedLog.actorDisplay ?? 'System'}
                  className="col-span-2"
                />
                <InspectorField
                  label="Actor type"
                  value={auditActorTypeLabel(selectedLog.actorType)}
                />
                <InspectorField label="When" value={formatDateTime(selectedLog.createdAt)} />
              </dl>
              <TechnicalDetails>
                <dl className="grid grid-cols-1 gap-3">
                  <InspectorField label="Target reference" value={selectedLog.entityId ?? '—'} mono />
                  <InspectorField label="Actor reference" value={selectedLog.actorUserId ?? '—'} mono />
                  <InspectorField label="Request reference" value={selectedLog.requestId ?? '—'} mono />
                  <InspectorField label="IP address" value={selectedLog.ipAddress ?? '—'} mono />
                  <InspectorField label="User agent" value={selectedLog.userAgent ?? '—'} />
                </dl>
              </TechnicalDetails>
              {selectedLog.metadata ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Metadata</p>
                  <pre className="bg-muted/40 max-h-64 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </AdminDockPanel>
      </>
    </AdminPageShell>
  );
}
