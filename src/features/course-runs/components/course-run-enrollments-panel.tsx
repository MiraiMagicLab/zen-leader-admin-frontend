import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileSpreadsheet, Plus, Trash2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
import { UserPicker } from '@/components/admin/user-picker';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { queryKeys } from '@/hooks/query-keys';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { confirmDiscard } from '@/lib/confirm-discard';
import { formatDateTime } from '@/lib/format';
import {
  enrollmentStatusClasses,
  enrollmentStatusLabel,
} from '@/lib/enrollment-status';
import { humanizeEnumValue } from '@/lib/humanize';
import { cn } from '@/lib/utils';
import {
  FILE_READ_ERROR_MESSAGE,
  snapshotUploadFile,
  validateExcelBuffer,
  validateExcelFile,
} from '@/lib/validate-excel-file';
import { enrollmentsApi } from '@/services/lms/lms-api';
import type { EnrollmentImportResponse, EnrollmentResponse, UserResponse } from '@/services/types/domain';

function EnrollmentMetaTable({ enrollment }: { enrollment: EnrollmentResponse }) {
  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: 'Name', value: enrollment.userDisplayName ?? '—' },
    { label: 'Email', value: enrollment.userEmail ?? '—' },
    {
      label: 'Role',
      value: <Badge variant="secondary">{humanizeEnumValue(enrollment.role ?? 'STUDENT')}</Badge>,
    },
    {
      label: 'Status',
      value: (
        <Badge variant="outline" className={cn(enrollmentStatusClasses(enrollment.status))}>
          {enrollmentStatusLabel(enrollment.status)}
        </Badge>
      ),
    },
    { label: 'Method', value: humanizeEnumValue(enrollment.enrolmentMethod) ?? '—' },
    {
      label: 'Enrolled at',
      value: enrollment.enrolledAt ? formatDateTime(enrollment.enrolledAt) : '—',
    },
    {
      label: 'Last accessed',
      value: enrollment.lastAccessedAt ? formatDateTime(enrollment.lastAccessedAt) : '—',
    },
    {
      label: 'Completed at',
      value: enrollment.completedAt ? formatDateTime(enrollment.completedAt) : '—',
    },
    {
      label: 'Progress',
      value: `${enrollment.progressPercent ?? 0}%`,
    },
  ];

  return (
    <dl className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type CourseRunEnrollmentsPanelProps = {
  runId: string;
  enrollments: EnrollmentResponse[];
  isLoading: boolean;
  totalPages: number;
  enrollmentPage: number;
  onEnrollmentPageChange: (page: number) => void;
  onOpenProgress: (enrollment: EnrollmentResponse) => void;
};

/**
 * Enrollment tab for the course run detail page: lists learners and owns manual
 * enroll, Excel import, edit, view, and delete enrollment CRUD flows.
 */
export function CourseRunEnrollmentsPanel({
  runId,
  enrollments,
  isLoading,
  totalPages,
  enrollmentPage,
  onEnrollmentPageChange,
  onOpenProgress,
}: CourseRunEnrollmentsPanelProps) {
  const queryClient = useQueryClient();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [enrollUsers, setEnrollUsers] = useState<UserResponse[]>([]);
  const [enrollStatus, setEnrollStatus] = useState('ACTIVE');
  const [enrollRole, setEnrollRole] = useState('STUDENT');
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileBufferRef = useRef<ArrayBuffer | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [editEnrollment, setEditEnrollment] = useState<EnrollmentResponse | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRole, setEditRole] = useState('STUDENT');
  const [viewEnrollment, setViewEnrollment] = useState<EnrollmentResponse | null>(null);
  const [importPreview, setImportPreview] = useState<EnrollmentImportResponse | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const enrollDirty =
    enrollUsers.length > 0 || enrollStatus !== 'ACTIVE' || enrollRole !== 'STUDENT';

  const editEnrollmentDirty =
    editEnrollment != null &&
    (editStatus !== editEnrollment.status ||
      editRole !== (editEnrollment.role ?? 'STUDENT'));

  const importDirty = importFile != null || importPreview != null;

  useBeforeUnload(
    (enrollOpen && enrollDirty) || (Boolean(editEnrollment) && editEnrollmentDirty) || (importOpen && importDirty),
  );

  const openEditEnrollment = (enrollment: EnrollmentResponse) => {
    setEditEnrollment(enrollment);
    setEditStatus(enrollment.status);
    setEditRole(enrollment.role ?? 'STUDENT');
  };

  const buildImportUploadFile = (): File | null => {
    if (!importFile || !importFileBufferRef.current) {
      return null;
    }
    if (importFileBufferRef.current.byteLength === 0) {
      return null;
    }
    const validationError = validateExcelBuffer(importFileBufferRef.current);
    if (validationError) {
      return null;
    }
    return new File([importFileBufferRef.current], importFile.name, {
      type:
        importFile.type ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  const resolveImportUploadFile = (): File => {
    const uploadFile = buildImportUploadFile();
    if (!uploadFile) {
      throw new Error(
        'Could not read the selected file. Save and close it in Excel, then choose the file again.',
      );
    }
    return uploadFile;
  };

  const invalidateEnrollments = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
  };

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.manualEnrollMany({
        userIds: enrollUsers.map((user) => user.id),
        courseRunId: runId,
        status: enrollStatus as 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED',
        role: enrollRole as 'STUDENT' | 'INSTRUCTOR',
      }),
    onSuccess: async (result) => {
      if (result.successCount === 0) {
        toast.error(
          result.failures[0]?.reason ??
            'Could not enroll selected learners. They may already be enrolled.',
        );
        return;
      }

      toast.success(
        `Enrolled ${result.successCount} learner${result.successCount === 1 ? '' : 's'}${
          result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''
        }.`,
      );
      setEnrollOpen(false);
      setEnrollUsers([]);
      setEnrollStatus('ACTIVE');
      setEnrollRole('STUDENT');
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(error),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return enrollmentsApi.importByExcel(runId, resolveImportUploadFile(), false);
    },
    onSuccess: async (result) => {
      if (result.successCount === 0) {
        toast.error(result.failures[0]?.reason ?? 'No learners were imported.');
        return;
      }

      toast.success(
        `Import done: ${result.successCount} succeeded${
          result.failedCount + result.skippedCount > 0
            ? `, ${result.failedCount + result.skippedCount} not imported`
            : ''
        }.`,
      );
      setImportFile(null);
      importFileBufferRef.current = null;
      setImportPreview(null);
      setImportOpen(false);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(error),
  });

  const previewImportMutation = useMutation({
    mutationFn: async () => {
      return enrollmentsApi.importByExcel(runId, resolveImportUploadFile(), true);
    },
    onSuccess: (result) => {
      setImportPreview(result);
      toast.success('Import previewed.');
    },
    onError: (error) => toast.error(error),
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.update(editEnrollment!.id, {
        status: editStatus as 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED',
        role: editRole as 'STUDENT' | 'INSTRUCTOR',
      }),
    onSuccess: async () => {
      toast.success('Enrollment updated.');
      setEditEnrollment(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(error),
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.remove(enrollmentId),
    onSuccess: async () => {
      toast.success('Enrollment deleted.');
      setPendingConfirm(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(error),
  });

  const enrollmentColumns = useMemo<ColumnDef<EnrollmentResponse>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) =>
          row.original.userDisplayName ?? row.original.userEmail ?? 'User',
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.userEmail ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => humanizeEnumValue(row.original.role ?? 'STUDENT'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(enrollmentStatusClasses(row.original.status))}
          >
            {enrollmentStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: 'enrolledAt',
        header: 'Enrolled at',
        cell: ({ row }) => formatDateTime(row.original.enrolledAt),
      },
    ],
    [],
  );

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Enrollment</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEnrollOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add learners
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-2 size-4" />
              Import Excel
            </Button>
          </div>
        </div>
        <DataTable
          columns={enrollmentColumns}
          data={enrollments}
          isLoading={isLoading}
          emptyMessage="No enrollments yet."
          showRowIndex
          pageOffset={(enrollmentPage - 1) * ADMIN_LIST_PAGE_SIZE}
          showPagination={false}
          onRowClick={setViewEnrollment}
          activeRowId={viewEnrollment?.id ?? null}
          getRowId={(row) => row.id}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            disabled={enrollmentPage <= 1}
            onClick={() => onEnrollmentPageChange(enrollmentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground self-center text-sm">
            Page {enrollmentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            disabled={enrollmentPage >= totalPages}
            onClick={() => onEnrollmentPageChange(enrollmentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </section>

      <Dialog
        open={enrollOpen}
        onOpenChange={(open) => {
          if (!open && !confirmDiscard(enrollDirty)) {
            return;
          }
          setEnrollOpen(open);
          if (!open) {
            setEnrollUsers([]);
            setEnrollStatus('ACTIVE');
            setEnrollRole('STUDENT');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add learners</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={enrollStatus} onValueChange={setEnrollStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={enrollRole} onValueChange={setEnrollRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <UserPicker
              open={enrollOpen}
              selectedUsers={enrollUsers}
              onSelectedUsersChange={setEnrollUsers}
              label="Select learners"
            />
          </div>
          <DialogFooter className="gap-2 sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirmDiscard(enrollDirty)) {
                  setEnrollOpen(false);
                  setEnrollUsers([]);
                  setEnrollStatus('ACTIVE');
                  setEnrollRole('STUDENT');
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={enrollUsers.length === 0 || enrollMutation.isPending}
            >
              Enroll {enrollUsers.length > 0 ? `(${enrollUsers.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminEditorDialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open && !confirmDiscard(importDirty)) {
            return;
          }
          setImportOpen(open);
          if (!open) {
            setImportPreview(null);
            setImportFile(null);
            importFileBufferRef.current = null;
          }
        }}
        title="Import enrollments via Excel"
        size="lg"
        footer={
          <AdminFormDialogFooter
            onCancel={() => {
              setImportOpen(false);
              setImportPreview(null);
              setImportFile(null);
              importFileBufferRef.current = null;
            }}
            secondaryActions={
              <Button
                type="button"
                variant="outline"
                disabled={
                  !importFile ||
                  previewImportMutation.isPending ||
                  importMutation.isPending
                }
                onClick={() => previewImportMutation.mutate()}
              >
                <Eye className="mr-2 size-4" />
                Preview
              </Button>
            }
            submitLabel="Import Excel"
            onSubmit={() => importMutation.mutate()}
            pending={importMutation.isPending || previewImportMutation.isPending}
            disabled={
              !importFile ||
              !importPreview ||
              importPreview.successCount === 0
            }
          />
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground space-y-2">
            <p>1. Download the template (.xlsx).</p>
            <p>2. Paste learner emails starting from row 2. Keep the header row: email, order_no, amount.</p>
            <p>3. Save as <strong>.xlsx</strong> in Excel, then <strong>close the file</strong> before Preview/Import.</p>
            <p>4. Preview, then import. Rows with unknown emails are skipped.</p>
            <p>5. Import is enabled only after Preview shows at least one OK row.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void enrollmentsApi
                .downloadImportTemplate()
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'enrollment-template.xlsx';
                  anchor.click();
                  URL.revokeObjectURL(url);
                })
                .catch((error) => toast.error(error));
            }}
          >
            <FileSpreadsheet className="mr-2 size-4" />
            Download template
          </Button>
          <div className="space-y-2">
            <Label>Choose file</Label>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                setImportPreview(null);
                if (!picked) {
                  setImportFile(null);
                  importFileBufferRef.current = null;
                  return;
                }

                void (async () => {
                  try {
                    const snapshot = await snapshotUploadFile(picked);
                    const validationError = await validateExcelFile(snapshot);
                    if (validationError) {
                      toast.error(validationError);
                      setImportFile(null);
                      importFileBufferRef.current = null;
                      event.target.value = '';
                      return;
                    }
                    importFileBufferRef.current = await snapshot.arrayBuffer();
                    setImportFile(snapshot);
                  } catch {
                    toast.error(FILE_READ_ERROR_MESSAGE);
                    setImportFile(null);
                    importFileBufferRef.current = null;
                    event.target.value = '';
                  }
                })();
              }}
            />

            {importFile ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{importFile.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {Math.round((importFile.size / 1024) * 10) / 10} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    importFileBufferRef.current = null;
                    if (importFileInputRef.current) {
                      importFileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="mr-1 size-4" /> Remove
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5 py-8 px-4 text-center hover:bg-muted/10 transition-colors cursor-pointer"
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <Upload className="text-muted-foreground size-5" />
                </div>
                <p className="mt-3 text-sm font-medium">Click to upload spreadsheet template</p>
                <p className="text-muted-foreground mt-1 text-xs">Excel format (.xlsx or .xls)</p>
              </button>
            )}
          </div>
          {importPreview ? (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p>
                Preview: {importPreview.successCount} OK, {importPreview.failedCount} failed,{' '}
                {importPreview.skippedCount} skipped / {importPreview.totalRows} rows
              </p>
              {importPreview.failures.length > 0 ? (
                <div className="space-y-2">
                  {importPreview.failures.slice(0, 10).map((failure) => (
                    <div
                      key={`${failure.rowNumber}-${failure.email ?? 'unknown'}`}
                      className="rounded-md border p-3"
                    >
                      <p className="font-medium">Row {failure.rowNumber}</p>
                      <p className="text-muted-foreground">{failure.reason}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AdminEditorDialog>

      <AdminDockPanel
        open={Boolean(viewEnrollment) && !editEnrollment && !pendingConfirm}
        onClose={() => setViewEnrollment(null)}
        title={
          viewEnrollment?.userDisplayName ??
          viewEnrollment?.userEmail ??
          'Enrollment details'
        }
        description={viewEnrollment?.userEmail ?? undefined}
        footer={
          viewEnrollment ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenProgress(viewEnrollment)}>
                <Eye className="mr-1.5 size-3.5" />
                Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  openEditEnrollment(viewEnrollment);
                  setViewEnrollment(null);
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructiveOutline"
                size="sm"
                onClick={() =>
                  setPendingConfirm({
                    title: 'Delete enrollment?',
                    description: (
                      <>
                        Remove{' '}
                        {viewEnrollment.userDisplayName ??
                          viewEnrollment.userEmail ??
                          'this learner'}{' '}
                        from this course run. This cannot be undone.
                      </>
                    ),
                    action: () => deleteEnrollmentMutation.mutate(viewEnrollment.id),
                  })
                }
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
            </>
          ) : null
        }
      >
        {viewEnrollment ? <EnrollmentMetaTable enrollment={viewEnrollment} /> : null}
      </AdminDockPanel>

      <Dialog
        open={Boolean(editEnrollment)}
        onOpenChange={(open) => {
          if (!open) {
            if (!confirmDiscard(editEnrollmentDirty)) {
              return;
            }
            setEditEnrollment(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit enrollment</DialogTitle>
            {editEnrollment ? (
              <DialogDescription>
                {editEnrollment.userDisplayName ?? editEnrollment.userEmail ?? 'Learner'}
                {editEnrollment.userEmail && editEnrollment.userDisplayName
                  ? ` · ${editEnrollment.userEmail}`
                  : ''}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (confirmDiscard(editEnrollmentDirty)) {
                  setEditEnrollment(null);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateEnrollmentMutation.mutate()}
              disabled={updateEnrollmentMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirm(null);
          }
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        onConfirm={() => pendingConfirm?.action()}
        pending={deleteEnrollmentMutation.isPending}
      />
    </>
  );
}
