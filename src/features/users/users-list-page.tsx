import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminBulkBar } from '@/components/admin/admin-bulk-bar';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActionMenu, tableActionsColumn } from '@/components/admin/table-row-actions';
import { DataTable } from '@/components/data-table/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { confirmDiscard } from '@/lib/confirm-discard';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { UserResponse } from '@/services/types/domain';
import {
  banUserApi,
  createUserApi,
  deleteUserApi,
  getUsersApi,
  updateUserRolesApi,
  updateUserStatusApi,
} from '@/services/users/users-api';

const ROLE_OPTIONS = ['admin', 'user'];

const EMPTY_CREATE_FORM = {
  email: '',
  displayName: '',
  password: '',
  role: 'user',
};

function getDefaultBanDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function getDisplayRoles(user: UserResponse): string[] {
  return user.roles.length > 0 ? user.roles : ['user'];
}

function isDeletedUser(user: UserResponse): boolean {
  return Boolean(user.deletedAt);
}

function renderStatus(user: UserResponse) {
  if (isDeletedUser(user)) {
    return { label: 'Deleted', variant: 'destructive' as const };
  }
  if (user.bannedUntil) {
    return { label: 'Banned', variant: 'destructive' as const };
  }
  if (user.isActive) {
    return { label: 'Active', variant: 'default' as const };
  }
  return { label: 'Locked', variant: 'outline' as const };
}

export function UsersListPage() {
  useAdminPageMeta(ADMIN_PAGE_META.users);

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banDate, setBanDate] = useState(getDefaultBanDate());
  const [banPermanent, setBanPermanent] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'lock' | 'unlock' | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [unbanConfirmOpen, setUnbanConfirmOpen] = useState(false);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const createDirty =
    createForm.email.trim() !== '' ||
    createForm.displayName.trim() !== '' ||
    createForm.password !== '' ||
    createForm.role !== 'user';
  useBeforeUnload(createDialogOpen && createDirty);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(keyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({
      page,
      keyword: search,
      role: roleFilter,
      status: statusFilter,
    }),
    queryFn: () =>
      getUsersApi({
        page,
        size: ADMIN_LIST_PAGE_SIZE,
        direction: 'DESC',
        field: 'createdAt',
        keyword: search || undefined,
        role: roleFilter,
        status: statusFilter,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatusApi(userId, { isActive }),
    onSuccess: () => {
      toast.success('User status updated.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rolesMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      updateUserRolesApi(userId, { roles }),
    onSuccess: () => {
      toast.success('Role updated.');
      setRolesDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUserApi({
        email: createForm.email.trim(),
        displayName: createForm.displayName.trim(),
        passwordHash: createForm.password,
        roles: [createForm.role],
        verified: true,
      }),
    onSuccess: () => {
      toast.success('User created.');
      setCreateDialogOpen(false);
      setCreateForm({ email: '', displayName: '', password: '', role: 'user' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, bannedUntil }: { userId: string; bannedUntil: string | null }) =>
      banUserApi(userId, { bannedUntil }),
    onSuccess: () => {
      toast.success('Ban status updated.');
      setBanDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUserApi(userId),
    onSuccess: () => {
      toast.success('User soft-deleted.');
      setDeleteConfirmOpen(false);
      clearSelectedUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openBanDialog = (user: UserResponse) => {
    setSelectedUser(user);
    setBanPermanent(false);
    setBanDate(getDefaultBanDate());
    setBanDialogOpen(true);
  };

  const openRolesDialog = (user: UserResponse) => {
    setSelectedUser(user);
    setSelectedRoles(getDisplayRoles(user));
    setRolesDialogOpen(true);
  };

  const openInspector = (user: UserResponse) => {
    setSelectedUser(user);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
  };

  const rows = usersQuery.data?.data ?? [];
  // Only non-deleted users can be locked/unlocked.
  const selectableRows = rows.filter((user) => !isDeletedUser(user));
  const selectedRowsOnPage = selectableRows.filter((user) => selectedIds.includes(user.id));
  const allSelectableSelected =
    selectableRows.length > 0 && selectedRowsOnPage.length === selectableRows.length;

  const toggleRow = useCallback((userId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, userId])] : current.filter((id) => id !== userId),
    );
  }, []);

  const selectableIds = selectableRows.map((user) => user.id).join(',');
  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? (selectableIds ? selectableIds.split(',') : []) : []);
    },
    [selectableIds],
  );

  const runBulkStatus = async () => {
    if (!bulkAction) {
      return;
    }
    const isActive = bulkAction === 'unlock';
    const targets = selectedRowsOnPage.map((user) => user.id);
    setBulkPending(true);
    try {
      for (const userId of targets) {
        await updateUserStatusApi(userId, { isActive });
      }
      toast.success(
        `${targets.length} ${targets.length === 1 ? 'user' : 'users'} ${
          isActive ? 'unlocked' : 'locked'
        }.`,
      );
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBulkPending(false);
      setBulkAction(null);
    }
  };

  const handleBanSubmit = () => {
    if (!selectedUser) {
      return;
    }
    const bannedUntil = banPermanent
      ? new Date('2099-12-31T23:59:59Z').toISOString()
      : new Date(`${banDate}T23:59:59Z`).toISOString();
    banMutation.mutate({ userId: selectedUser.id, bannedUntil });
  };

  const hasActiveFilters =
    Boolean(keyword.trim()) || roleFilter !== 'all' || statusFilter !== 'all';

  const handleRoleFilterChange = (value: string) => {
    setPage(1);
    setRoleFilter(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleClearFilters = () => {
    setPage(1);
    setKeyword('');
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Select all users on this page"
            checked={allSelectableSelected}
            disabled={selectableRows.length === 0}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
        ),
        cell: ({ row }) =>
          isDeletedUser(row.original) ? null : (
            <Checkbox
              aria-label="Select user"
              checked={selectedIds.includes(row.original.id)}
              onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)}
            />
          ),
        enableSorting: false,
      },
      {
        accessorKey: 'displayName',
        header: 'User',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.displayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'roles',
        header: 'Roles',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {getDisplayRoles(row.original).map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const user = row.original;
          const status = renderStatus(user);
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant={status.variant}>{status.label}</Badge>
              {!user.isVerified ? <Badge variant="outline">Unverified</Badge> : null}
            </div>
          );
        },
      },
      {
        ...tableActionsColumn<UserResponse>(),
        cell: ({ row }) => {
          const user = row.original;
          const deleted = isDeletedUser(user);
          const items = [];

          if (!deleted) {
            items.push({
              label: 'Edit role',
              onClick: () => openRolesDialog(user),
            });
            if (user.isActive) {
              items.push({
                label: 'Lock',
                icon: Lock,
                onClick: () => {
                  setSelectedUser(user);
                  setLockConfirmOpen(true);
                },
              });
            } else {
              items.push({
                label: 'Unlock',
                icon: Unlock,
                onClick: () =>
                  statusMutation.mutate({ userId: user.id, isActive: true }),
              });
            }
            if (user.bannedUntil) {
              items.push({
                label: 'Unban',
                icon: ShieldAlert,
                onClick: () => {
                  setSelectedUser(user);
                  setUnbanConfirmOpen(true);
                },
              });
            } else {
              items.push({
                label: 'Ban',
                icon: ShieldAlert,
                onClick: () => {
                  setSelectedUser(user);
                  setBanConfirmOpen(true);
                },
              });
            }
            items.push({
              label: 'Soft delete',
              icon: Trash2,
              destructive: true,
              onClick: () => {
                setSelectedUser(user);
                setDeleteConfirmOpen(true);
              },
            });
          }

          return (
            <TableRowActionMenu
              menuLabel={`Actions for ${user.displayName}`}
              items={items}
            />
          );
        },
      },
    ],
    [
      statusMutation,
      selectedIds,
      allSelectableSelected,
      selectableRows,
      toggleAll,
      toggleRow,
    ],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Users"
      description="Manage account access, roles, and moderation. Select a row to inspect in the dock."
      actions={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add user
          </Button>
          <Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      }
      toolbar={
        <AdminFilterBar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Search by name or email"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={handleClearFilters}
        >
          <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Locked</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </AdminFilterBar>
      }
    >
      <>
        <AdminDockLayout dockOpen={Boolean(selectedUser)}>
          <div className="flex flex-col gap-3">
            {usersQuery.isError ? (
              <AdminQueryError
                message={getApiErrorMessage(usersQuery.error)}
                onRetry={() => void usersQuery.refetch()}
              />
            ) : null}

            <AdminBulkBar count={selectedRowsOnPage.length}>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkPending}
                onClick={() => setBulkAction('lock')}
              >
                <Lock className="mr-2 size-4" />
                Lock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkPending}
                onClick={() => setBulkAction('unlock')}
              >
                <Unlock className="mr-2 size-4" />
                Unlock
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </AdminBulkBar>

            <DataTable
              columns={columns}
              data={rows}
              isLoading={usersQuery.isLoading}
              emptyMessage="No users found."
              showRowIndex
              pageOffset={(page - 1) * ADMIN_LIST_PAGE_SIZE}
              showPagination={false}
              activeRowId={selectedUser?.id ?? null}
              getRowId={(row) => row.id}
              onRowClick={openInspector}
            />

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Total: {usersQuery.data?.totalElement ?? 0} users
              </p>
              <ServerPagination
                page={page}
                totalPages={usersQuery.data?.totalPages ?? 1}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  clearSelectedUser();
                }}
                pageBase={1}
              />
            </div>
          </div>
        </AdminDockLayout>

        <AdminDockPanel
          open={Boolean(selectedUser)}
          onClose={clearSelectedUser}
          title="User detail"
          description={
            selectedUser ? `${selectedUser.displayName} (${selectedUser.email})` : undefined
          }
          footer={
            selectedUser && !isDeletedUser(selectedUser) ? (
              <Button variant="ghost" size="sm" onClick={() => openRolesDialog(selectedUser)}>
                Edit role
              </Button>
            ) : null
          }
        >
          {selectedUser ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InspectorField
                label="User ID"
                value={selectedUser.id}
                mono
                className="col-span-2"
              />
              <InspectorField label="Display name" value={selectedUser.displayName} />
              <InspectorField label="Email" value={selectedUser.email} />
              <InspectorField
                label="Roles"
                value={
                  <div className="flex flex-wrap gap-1">
                    {getDisplayRoles(selectedUser).map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                }
                className="col-span-2"
              />
              <InspectorField
                label="Status"
                value={
                  <Badge variant={renderStatus(selectedUser).variant}>
                    {renderStatus(selectedUser).label}
                  </Badge>
                }
              />
              <InspectorField label="Verified" value={selectedUser.isVerified ? 'Yes' : 'No'} />
              <InspectorField
                label="Banned until"
                value={formatDateTime(selectedUser.bannedUntil)}
              />
              <InspectorField
                label="Deleted at"
                value={formatDateTime(selectedUser.deletedAt)}
              />
              <InspectorField label="Created at" value={formatDateTime(selectedUser.createdAt)} />
              <InspectorField label="Updated at" value={formatDateTime(selectedUser.updatedAt)} />
            </dl>
          ) : null}
        </AdminDockPanel>
      </>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open && !confirmDiscard(createDirty)) {
            return;
          }
          setCreateDialogOpen(open);
          if (open) {
            setCreateForm(EMPTY_CREATE_FORM);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="create-user-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-email"
                name="create-user-email"
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-name">
                Display name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-name"
                name="create-user-name"
                autoComplete="off"
                value={createForm.displayName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-password"
                name="create-user-password"
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(role) =>
                  setCreateForm((current) => ({ ...current, role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !createForm.email.trim() ||
                  !createForm.displayName.trim() ||
                  createForm.password.length < 6
                }
              >
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedUser?.displayName} ({selectedUser?.email})
            </p>
            <div className="space-y-2">
              <Label>Primary role</Label>
              <Select
                value={selectedRoles[0] ?? 'user'}
                onValueChange={(value) => setSelectedRoles([value])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!selectedUser) {
                  return;
                }
                rolesMutation.mutate({
                  userId: selectedUser.id,
                  roles: selectedRoles,
                });
              }}
              disabled={rolesMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedUser?.displayName} ({selectedUser?.email})
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ban-permanent"
                checked={banPermanent}
                onCheckedChange={(checked) => setBanPermanent(checked === true)}
              />
              <Label htmlFor="ban-permanent" className="cursor-pointer">
                Permanent ban
              </Label>
            </div>
            {!banPermanent ? (
              <div className="space-y-2">
                <Label htmlFor="ban-date">Ban expiry date</Label>
                <Input
                  id="ban-date"
                  type="date"
                  value={banDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setBanDate(event.target.value)}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                User will be banned until admin manually unbans.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanSubmit}
              disabled={banMutation.isPending || (!banPermanent && !banDate)}
            >
              Confirm ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkPending) {
            setBulkAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'unlock' ? 'Unlock selected users?' : 'Lock selected users?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will {bulkAction === 'unlock' ? 'unlock' : 'lock'} {selectedRowsOnPage.length}{' '}
              {selectedRowsOnPage.length === 1 ? 'account' : 'accounts'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkPending}
              onClick={(event) => {
                event.preventDefault();
                void runBulkStatus();
              }}
            >
              {bulkPending ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={banConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBanConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser
                ? `"${selectedUser.displayName}" will be restricted from accessing the platform. You can set the ban duration on the next screen.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setBanConfirmOpen(false);
                openBanDialog(selectedUser!);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unbanConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUnbanConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser
                ? `"${selectedUser.displayName}" will regain access to the platform immediately.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  banMutation.mutate({ userId: selectedUser.id, bannedUntil: null });
                }
                setUnbanConfirmOpen(false);
              }}
            >
              Unban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={lockConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLockConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser
                ? `"${selectedUser.displayName}" will be locked out of their account until you unlock them.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  statusMutation.mutate({ userId: selectedUser.id, isActive: false });
                }
                setLockConfirmOpen(false);
              }}
            >
              Lock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser
                ? `"${selectedUser.displayName}" will be marked as deleted and lose access to the platform. This can be reversed by an administrator.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (selectedUser) {
                  deleteMutation.mutate(selectedUser.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Soft delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
