import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, MoreHorizontal, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notificationsApi } from '@/services/notifications/notifications-api';
import { relationshipsApi } from '@/services/relationships/relationships-api';
import { progressApi } from '@/services/progress/progress-api';
import { streaksApi } from '@/services/streaks/streaks-api';
import { enrollmentsApi } from '@/services/lms/lms-api';
import {
  banUserApi,
  getUserByIdApi,
  updateUserRolesApi,
  updateUserStatusApi,
} from '@/services/users/users-api';

const ROLE_OPTIONS = ['admin', 'user'];

function getDefaultBanDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function UserDetailPage() {
  const { userId } = useParams();
  const queryClient = useQueryClient();
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banDate, setBanDate] = useState(getDefaultBanDate());
  const [banPermanent, setBanPermanent] = useState(false);
  const [progressRunId, setProgressRunId] = useState<string>('');
  const [streakFrom, setStreakFrom] = useState(
    () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [streakTo, setStreakTo] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const userQuery = useQuery({
    queryKey: queryKeys.users.detail(userId ?? ''),
    queryFn: () => getUserByIdApi(userId!),
    enabled: Boolean(userId),
  });

  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.byUser(userId ?? ''),
    queryFn: () => enrollmentsApi.getByUser(userId!),
    enabled: Boolean(userId),
  });

  const streakQuery = useQuery({
    queryKey: queryKeys.streaks.summary(userId ?? ''),
    queryFn: () => streaksApi.getSummary(userId!),
    enabled: Boolean(userId),
  });

  const friendsQuery = useQuery({
    queryKey: queryKeys.relationships.friends(userId ?? ''),
    queryFn: () => relationshipsApi.getFriends(userId!),
    enabled: Boolean(userId),
  });

  const requestsQuery = useQuery({
    queryKey: queryKeys.relationships.requests(userId ?? ''),
    queryFn: () => relationshipsApi.getRequests(userId!),
    enabled: Boolean(userId),
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.byUser(userId ?? ''),
    queryFn: () => notificationsApi.getByUser(userId!),
    enabled: Boolean(userId),
  });

  const progressSummaryQuery = useQuery({
    queryKey: queryKeys.progress.summary(userId ?? '', progressRunId),
    queryFn: () => progressApi.getSummary(userId!, progressRunId),
    enabled: Boolean(userId && progressRunId),
  });

  const progressSyllabusQuery = useQuery({
    queryKey: queryKeys.progress.syllabus(userId ?? '', progressRunId),
    queryFn: () => progressApi.getSyllabus(userId!, progressRunId),
    enabled: Boolean(userId && progressRunId),
  });

  const progressSessionsQuery = useQuery({
    queryKey: queryKeys.progress.sessions(userId ?? '', progressRunId),
    queryFn: () => progressApi.getSessions(userId!, progressRunId),
    enabled: Boolean(userId && progressRunId),
  });

  const streakLogsQuery = useQuery({
    queryKey: [...queryKeys.streaks.summary(userId ?? ''), streakFrom, streakTo],
    queryFn: () => streaksApi.getLogs(userId!, streakFrom, streakTo),
    enabled: Boolean(userId && streakFrom && streakTo),
  });

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      updateUserStatusApi(userId!, { isActive }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rolesMutation = useMutation({
    mutationFn: () => updateUserRolesApi(userId!, { roles: selectedRoles }),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò.');
      setRolesDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const banMutation = useMutation({
    mutationFn: (bannedUntil: string | null) =>
      banUserApi(userId!, { bannedUntil }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái ban.');
      setBanDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openBanDialog = () => {
    setBanPermanent(false);
    setBanDate(getDefaultBanDate());
    setBanDialogOpen(true);
  };

  const handleBanSubmit = () => {
    const bannedUntil = banPermanent
      ? new Date('2099-12-31T23:59:59Z').toISOString()
      : new Date(banDate + 'T23:59:59Z').toISOString();
    banMutation.mutate(bannedUntil);
  };

  const user = userQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.users}>
          <ArrowLeft className="mr-2 size-4" />
          Quay lại người dùng
        </Link>
      </Button>

      <PageHeader
        title={user?.displayName ?? 'Người dùng'}
        description={user?.email}
        actions={
          user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 size-4" />
                  Thao tác
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedRoles(user.roles);
                    setRolesDialogOpen(true);
                  }}
                >
                  Sửa vai trò
                </DropdownMenuItem>
                {user.isActive ? (
                  <DropdownMenuItem onClick={() => statusMutation.mutate(false)}>
                    <ShieldOff className="mr-2 size-4" />
                    Khóa tài khoản
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => statusMutation.mutate(true)}>
                    <ShieldCheck className="mr-2 size-4" />
                    Mở khóa tài khoản
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {user.bannedUntil ? (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => banMutation.mutate(null)}
                  >
                    <Ban className="mr-2 size-4" />
                    Gỡ ban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={openBanDialog}
                  >
                    <Ban className="mr-2 size-4" />
                    Ban người dùng
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Hoạt động</p>
              <Badge variant={user.isActive ? 'default' : 'outline'}>
                {user.isActive ? 'Hoạt động' : 'Đã khóa'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Xác minh</p>
              <Badge variant={user.isVerified ? 'default' : 'outline'}>
                {user.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Ban đến</p>
              <p>{user.bannedUntil ? formatDateTime(user.bannedUntil) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Đăng nhập lần cuối</p>
              <p>{user.lastSignInAt ? formatDateTime(user.lastSignInAt) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Ngày tạo</p>
              <p>{formatDateTime(user.createdAt)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-sm">Vai trò</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="enrollments">
        <TabsList>
          <TabsTrigger value="enrollments">
            Ghi danh ({enrollmentsQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="progress">Tiến độ học</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="friends">
            Bạn bè ({friendsQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Thông báo ({notificationsQuery.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="space-y-2">
          {(enrollmentsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có ghi danh.</p>
          ) : (
            enrollmentsQuery.data?.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{enrollment.courseRunCode}</p>
                  <p className="text-muted-foreground text-xs">
                    {enrollment.role ?? 'STUDENT'} · {enrollment.status}
                    {enrollment.progressPercent != null &&
                      ` · ${enrollment.progressPercent}%`}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={ROUTES.courseRunDetail(enrollment.courseRunId)}>
                    Xem lớp
                  </Link>
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Đợt học</Label>
              <select
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={progressRunId}
                onChange={(e) => setProgressRunId(e.target.value)}
              >
                <option value="">Chọn lớp...</option>
                {(enrollmentsQuery.data ?? []).map((e) => (
                  <option key={e.id} value={e.courseRunId}>
                    {e.courseRunCode}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {progressSummaryQuery.data ? (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">Giáo trình</p>
                  <p className="text-2xl font-semibold">
                    {progressSummaryQuery.data.completedSyllabusItems}/
                    {progressSummaryQuery.data.totalSyllabusItems}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {progressSummaryQuery.data.syllabusProgressPercent ?? 0}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Buổi học</p>
                  <p className="text-2xl font-semibold">
                    {progressSummaryQuery.data.attendedSessions}/
                    {progressSummaryQuery.data.totalSessions}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {progressSummaryQuery.data.sessionProgressPercent ?? 0}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Cập nhật</p>
                  <p>
                    {progressSummaryQuery.data.lastUpdatedAt
                      ? formatDateTime(progressSummaryQuery.data.lastUpdatedAt)
                      : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : progressRunId ? (
            <p className="text-muted-foreground text-sm">Đang tải tiến độ...</p>
          ) : (
            <p className="text-muted-foreground text-sm">Chọn lớp để xem tiến độ.</p>
          )}
          {(progressSyllabusQuery.data ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Mục giáo trình</p>
              {progressSyllabusQuery.data?.map((sp) => (
                <div key={sp.syllabusItemId} className="rounded-md border p-3 text-sm">
                  {sp.syllabusItemTitle} · {sp.status} · {sp.progressPercent ?? 0}%
                </div>
              ))}
            </div>
          )}
          {(progressSessionsQuery.data ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Buổi học</p>
              {progressSessionsQuery.data?.map((sa) => (
                <div key={sa.sessionId} className="rounded-md border p-3 text-sm">
                  #{sa.sessionNumber} {sa.sessionTitle} · {sa.status}
                  {sa.scheduledAt && ` · ${formatDateTime(sa.scheduledAt)}`}
                  {sa.attendedAt && ` · Điểm danh: ${formatDateTime(sa.attendedAt)}`}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="streak" className="space-y-4">
          {streakQuery.data ? (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-sm">Streak hiện tại</p>
                  <p className="text-2xl font-semibold">{streakQuery.data.currentStreak}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Dài nhất</p>
                  <p className="text-2xl font-semibold">{streakQuery.data.longestStreak}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Hoạt động gần nhất</p>
                  <p>{streakQuery.data.lastActiveDate ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm">Chưa có dữ liệu streak.</p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Từ ngày</Label>
              <Input type="date" value={streakFrom} onChange={(e) => setStreakFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Đến ngày</Label>
              <Input type="date" value={streakTo} onChange={(e) => setStreakTo(e.target.value)} />
            </div>
          </div>
          {(streakLogsQuery.data ?? []).length > 0 && (
            <div className="space-y-2">
              {streakLogsQuery.data?.map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  {log.activityDate} · {log.status} · {log.sourceAction ?? '—'}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Bạn bè</p>
            {(friendsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có bạn bè.</p>
            ) : (
              friendsQuery.data?.map((rel) => {
                const friend =
                  rel.requester.userId === userId ? rel.addressee : rel.requester;
                return (
                  <div key={rel.id} className="rounded-md border p-3">
                    {friend.displayName}
                  </div>
                );
              })
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Lời mời đang chờ</p>
            {(requestsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có lời mời.</p>
            ) : (
              requestsQuery.data?.map((rel) => (
                <div key={rel.id} className="rounded-md border p-3">
                  {rel.requester.displayName} → {rel.addressee.displayName}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-2">
          {(notificationsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có thông báo.</p>
          ) : (
            notificationsQuery.data?.slice(0, 20).map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{n.title}</p>
                  <Badge variant={n.isRead ? 'outline' : 'default'}>
                    {n.isRead ? 'Đã đọc' : 'Chưa đọc'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{n.message}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatDateTime(n.createdAt)} · {n.type}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa vai trò</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="user-role"
                  checked={selectedRoles[0] === role}
                  onChange={() => setSelectedRoles([role])}
                />
                <span>{role}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => rolesMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban người dùng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {user?.displayName} ({user?.email})
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ban-permanent-detail"
                checked={banPermanent}
                onCheckedChange={(checked) => setBanPermanent(checked === true)}
              />
              <Label htmlFor="ban-permanent-detail" className="cursor-pointer">
                Ban vĩnh viễn
              </Label>
            </div>
            {!banPermanent && (
              <div className="space-y-2">
                <Label htmlFor="ban-date-detail">Ngày hết hạn ban</Label>
                <Input
                  id="ban-date-detail"
                  type="date"
                  value={banDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBanDate(e.target.value)}
                />
              </div>
            )}
            {banPermanent && (
              <p className="text-muted-foreground text-xs">
                Người dùng sẽ bị ban cho đến khi admin gỡ ban thủ công.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanSubmit}
              disabled={banMutation.isPending || (!banPermanent && !banDate)}
            >
              Xác nhận ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
