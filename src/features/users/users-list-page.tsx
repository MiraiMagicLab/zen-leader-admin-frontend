import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Ban,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { UserResponse } from '@/services/types/domain';
import {
  banUserApi,
  createUserApi,
  getUsersApi,
  updateUserRolesApi,
  updateUserStatusApi,
} from '@/services/users/users-api';

const ROLE_OPTIONS = ['admin', 'user'];

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
  if (user.isActive) {
    return { label: 'Active', variant: 'default' as const };
  }
  return { label: 'Locked', variant: 'outline' as const };
}

export function UsersListPage() {
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
  const [createForm, setCreateForm] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'user',
  });

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
        size: 10,
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

  const handleBanSubmit = () => {
    if (!selectedUser) {
      return;
    }
    const bannedUntil = banPermanent
      ? new Date('2099-12-31T23:59:59Z').toISOString()
      : new Date(`${banDate}T23:59:59Z`).toISOString();
    banMutation.mutate({ userId: selectedUser.id, bannedUntil });
  };

  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Display name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.displayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'roles',
        header: 'Role',
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
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
          const status = renderStatus(row.original);
          return <Badge variant={status.variant}>{status.label}</Badge>;
        },
      },
      {
        accessorKey: 'isVerified',
        header: 'Verified',
        cell: ({ row }) => (
          <Badge variant={row.original.isVerified ? 'default' : 'outline'}>
            {row.original.isVerified ? 'Verified' : 'Unverified'}
          </Badge>
        ),
      },
      {
        accessorKey: 'bannedUntil',
        header: 'Ban',
        cell: ({ row }) =>
          row.original.bannedUntil ? (
            <Badge variant="destructive">{formatDateTime(row.original.bannedUntil)}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        accessorKey: 'deletedAt',
        header: 'Deleted at',
        cell: ({ row }) =>
          row.original.deletedAt ? (
            <Badge variant="destructive">{formatDateTime(row.original.deletedAt)}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created date',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openRolesDialog(row.original)}>
                Edit role
              </DropdownMenuItem>
              {!isDeletedUser(row.original) &&
                (row.original.isActive ? (
                  <DropdownMenuItem
                    onClick={() =>
                      statusMutation.mutate({
                        userId: row.original.id,
                        isActive: false,
                      })
                    }
                  >
                    <ShieldOff className="mr-2 size-4" />
                    Lock account
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() =>
                      statusMutation.mutate({
                        userId: row.original.id,
                        isActive: true,
                      })
                    }
                  >
                    <ShieldCheck className="mr-2 size-4" />
                    Unlock account
                  </DropdownMenuItem>
                ))}
              {!isDeletedUser(row.original) && <DropdownMenuSeparator />}
              {!isDeletedUser(row.original) &&
                (row.original.bannedUntil ? (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      banMutation.mutate({ userId: row.original.id, bannedUntil: null })
                    }
                  >
                    <Ban className="mr-2 size-4" />
                    Unban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => openBanDialog(row.original)}
                  >
                    <Ban className="mr-2 size-4" />
                    Ban user
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [banMutation, statusMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Users"
        description="Shows both active and self-deleted accounts for full user lifecycle tracking."
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
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by email or name..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      </div>

      <DataTable
        columns={columns}
        data={usersQuery.data?.data ?? []}
        isLoading={usersQuery.isLoading}
        emptyMessage="No users found."
        showRowIndex
        pageOffset={(page - 1) * 10}
        showPagination={false}
      />

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Total: {usersQuery.data?.totalElement ?? 0} users
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous page
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} / {usersQuery.data?.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (usersQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            Next page
          </Button>
        </div>
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (open) {
            setCreateForm({ email: '', displayName: '', password: '', role: 'user' });
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
              <Label htmlFor="create-user-email">Email</Label>
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
              <Label htmlFor="create-user-name">Display name</Label>
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
              <Label htmlFor="create-user-password">Password</Label>
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
            <p className="text-muted-foreground text-xs">
              Account is created with verified email and can log in immediately.
            </p>
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
    </div>
  );
}
