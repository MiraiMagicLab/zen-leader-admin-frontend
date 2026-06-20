import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
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
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
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

export function UsersListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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
    queryKey: queryKeys.users.list({ page, keyword: search }),
    queryFn: () =>
      getUsersApi({
        page,
        size: 10,
        direction: 'DESC',
        field: 'createdAt',
        keyword: search || undefined,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatusApi(userId, { isActive }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái người dùng.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rolesMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      updateUserRolesApi(userId, { roles }),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò.');
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
      toast.success('Đã tạo người dùng.');
      setCreateDialogOpen(false);
      setCreateForm({ email: '', displayName: '', password: '', role: 'user' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) =>
      banUserApi(userId, {
        bannedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Đã ban người dùng 7 ngày.');
      setBanDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Tên hiển thị',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.displayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'roles',
        header: 'Vai trò',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Hoạt động',
        cell: ({ row }) => (
          <Switch
            checked={row.original.isActive}
            onCheckedChange={(checked) =>
              statusMutation.mutate({ userId: row.original.id, isActive: checked })
            }
          />
        ),
      },
      {
        accessorKey: 'isVerified',
        header: 'Xác minh',
        cell: ({ row }) => (
          <Badge variant={row.original.isVerified ? 'default' : 'outline'}>
            {row.original.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
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
              <DropdownMenuItem asChild>
                <Link to={ROUTES.userDetail(row.original.id)}>Xem chi tiết</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(row.original);
                  setSelectedRoles(row.original.roles);
                  setRolesDialogOpen(true);
                }}
              >
                Sửa vai trò
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(row.original);
                  setBanDialogOpen(true);
                }}
              >
                Ban 7 ngày
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [statusMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản, trạng thái và phân quyền."
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Thêm người dùng
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void usersQuery.refetch()}
            >
              <RefreshCw className="mr-2 size-4" />
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Tìm theo email hoặc tên…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={usersQuery.data?.data ?? []}
        isLoading={usersQuery.isLoading}
        emptyMessage="Không tìm thấy người dùng."
      />

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Tổng: {usersQuery.data?.totalElement ?? 0} người dùng
        </p>
        <div className="flex gap-2">
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
            disabled={page >= (usersQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
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
            <DialogTitle>Thêm người dùng</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
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
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Tên hiển thị</Label>
              <Input
                id="create-user-name"
                name="create-user-name"
                autoComplete="off"
                value={createForm.displayName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-password">Mật khẩu</Label>
              <Input
                id="create-user-password"
                name="create-user-password"
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select
                value={createForm.role}
                onValueChange={(role) => setCreateForm((f) => ({ ...f, role }))}
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
              Tài khoản được tạo với trạng thái đã xác minh email, có thể đăng nhập ngay.
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
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật vai trò</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedUser?.displayName} ({selectedUser?.email})
            </p>
            <div className="space-y-2">
              <Label>Vai trò chính</Label>
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
                if (!selectedUser) return;
                rolesMutation.mutate({
                  userId: selectedUser.id,
                  roles: selectedRoles,
                });
              }}
              disabled={rolesMutation.isPending}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban người dùng?</AlertDialogTitle>
            <AlertDialogDescription>
              Ban {selectedUser?.email} trong 7 ngày. Hành động này có thể hoàn tác
              bằng cách đặt bannedUntil = null qua API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && banMutation.mutate(selectedUser.id)}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
