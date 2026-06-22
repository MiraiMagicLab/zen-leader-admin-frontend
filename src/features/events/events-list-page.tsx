import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { eventStatusLabel, eventTypeLabel, normalizeEventStatus } from '@/lib/event-labels';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { eventsApi } from '@/services/events/events-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { EventAdminFeedParams, EventResponse } from '@/services/types/domain';

const PAGE_SIZE = 10;

type EventForm = {
  title: string;
  description: string;
  content: string;
  startTime: string;
  endTime: string;
  publishImmediately: boolean;
  isOfficial: boolean;
  thumbnailFile: File | null;
};

type EventTypeFilter = 'all' | 'official' | 'community';
type EventActionKind = 'publish' | 'unpublish' | 'delete';

type PendingEventAction = {
  eventId: string;
  eventTitle: string;
  action: EventActionKind;
};

const emptyForm: EventForm = {
  title: '',
  description: '',
  content: '',
  startTime: '',
  endTime: '',
  publishImmediately: true,
  isOfficial: false,
  thumbnailFile: null,
};

export function EventsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [keyword, setKeyword] = useState('');
  const [authorKeyword, setAuthorKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all');
  const [pendingAction, setPendingAction] = useState<PendingEventAction | null>(null);

  const listParams = useMemo<EventAdminFeedParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      status: status === 'all' ? undefined : status,
      isOfficial:
        typeFilter === 'all' ? undefined : typeFilter === 'official',
      authorKeyword: authorKeyword.trim() || undefined,
    }),
    [authorKeyword, keyword, page, status, typeFilter],
  );

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(listParams),
    queryFn: () => eventsApi.getAdminFeed(listParams),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let thumbnailUrl: string | undefined;
      if (form.thumbnailFile) {
        thumbnailUrl = (await assetsApi.uploadViaPresigned(form.thumbnailFile)).downloadUrl;
      }

      return eventsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content.trim() || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        publishImmediately: form.publishImmediately,
        isOfficial: form.isOfficial,
        thumbnailUrl,
      });
    },
    onSuccess: () => {
      toast.success('Đã tạo sự kiện.');
      setSheetOpen(false);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.publish(id),
    onSuccess: () => {
      toast.success('Đã xuất bản sự kiện.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.unpublish(id),
    onSuccess: () => {
      toast.success('Đã chuyển sự kiện về nháp.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa sự kiện.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const isConfirmingAction =
    publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending;

  const openActionDialog = (
    eventId: string,
    eventTitle: string,
    action: EventActionKind,
  ) => {
    setPendingAction({ eventId, eventTitle, action });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.action === 'publish') {
      publishMutation.mutate(pendingAction.eventId, {
        onSuccess: () => setPendingAction(null),
      });
      return;
    }

    if (pendingAction.action === 'unpublish') {
      unpublishMutation.mutate(pendingAction.eventId, {
        onSuccess: () => setPendingAction(null),
      });
      return;
    }

    deleteMutation.mutate(pendingAction.eventId, {
      onSuccess: () => setPendingAction(null),
    });
  };

  const columns = useMemo<ColumnDef<EventResponse>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Sự kiện',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.title}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {row.original.description || 'Chưa có mô tả'}
            </p>
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Loại',
        cell: ({ row }) => (
          <Badge variant={row.original.isOfficial ? 'default' : 'secondary'}>
            {eventTypeLabel(row.original.isOfficial)}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge variant="secondary">{eventStatusLabel(row.original.status)}</Badge>
        ),
      },
      {
        id: 'author',
        header: 'Người tạo',
        cell: ({ row }) =>
          row.original.isOfficial ? 'Hệ thống Zen Leader' : row.original.author.name,
      },
      {
        accessorKey: 'startTime',
        header: 'Bắt đầu',
        cell: ({ row }) => formatDateTime(row.original.startTime),
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
                <Link to={ROUTES.eventDetail(row.original.id)}>Chi tiết</Link>
              </DropdownMenuItem>
              {normalizeEventStatus(row.original.status) !== 'PUBLISHED' ? (
                <DropdownMenuItem
                  onClick={() =>
                    openActionDialog(row.original.id, row.original.title, 'publish')
                  }
                >
                  Xuất bản
                </DropdownMenuItem>
              ) : null}
              {normalizeEventStatus(row.original.status) !== 'DRAFT' ? (
                <DropdownMenuItem
                  onClick={() =>
                    openActionDialog(row.original.id, row.original.title, 'unpublish')
                  }
                >
                  Chuyển về nháp
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => openActionDialog(row.original.id, row.original.title, 'delete')}
              >
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteMutation, publishMutation, unpublishMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Sự kiện"
        description="Quản lý sự kiện hệ thống và phiên do cộng đồng tạo qua luồng meet nội bộ."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setSheetOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Thêm sự kiện
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tiêu đề hoặc mô tả…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <Input
          placeholder="Lọc theo tên hoặc email người tạo"
          value={authorKeyword}
          onChange={(event) => {
            setAuthorKeyword(event.target.value);
            setPage(0);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="DRAFT">Nháp</SelectItem>
            <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
            <SelectItem value="COMPLETED">Đã kết thúc</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value: EventTypeFilter) => {
            setTypeFilter(value);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="official">Sự kiện hệ thống</SelectItem>
            <SelectItem value="community">Sự kiện người dùng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={eventsQuery.data?.data ?? []}
        isLoading={eventsQuery.isLoading}
        showRowIndex
        pageOffset={(eventsQuery.data?.currentPage ?? page) * PAGE_SIZE}
        showPagination={false}
        emptyMessage="Chưa có sự kiện nào."
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={(eventsQuery.data?.currentPage ?? page) <= 0}
          onClick={() => setPage((currentPage) => currentPage - 1)}
        >
          Trang trước
        </Button>
        <span className="text-muted-foreground text-sm">
          Trang {(eventsQuery.data?.currentPage ?? page) + 1} /{' '}
          {eventsQuery.data?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={(eventsQuery.data?.currentPage ?? page) + 1 >= (eventsQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((currentPage) => currentPage + 1)}
        >
          Trang sau
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Thêm sự kiện</SheetTitle>
            <SheetDescription>
              Hệ thống sẽ tạo phòng meet và liên kết tham gia qua dịch vụ meet nội bộ.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Tiêu đề</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Mô tả</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-content">Nội dung</Label>
              <Textarea
                id="event-content"
                rows={6}
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Thời gian bắt đầu</Label>
                <DateTimePicker
                  value={form.startTime}
                  onChange={(startTime) => setForm((current) => ({ ...current, startTime }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Thời gian kết thúc</Label>
                <DateTimePicker
                  value={form.endTime}
                  onChange={(endTime) => setForm((current) => ({ ...current, endTime }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-thumbnail">Ảnh thumbnail</Label>
              <Input
                id="event-thumbnail"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    thumbnailFile: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.publishImmediately}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, publishImmediately: checked }))
                }
              />
              <Label>Xuất bản ngay</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isOfficial}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isOfficial: checked }))
                }
              />
              <Label>Sự kiện hệ thống</Label>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.title.trim() ||
                !form.startTime ||
                !form.endTime
              }
            >
              Tạo sự kiện
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isConfirmingAction) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'publish'
                ? 'Xuất bản sự kiện này?'
                : pendingAction?.action === 'unpublish'
                  ? 'Chuyển sự kiện về nháp?'
                  : 'Xóa sự kiện này?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'publish'
                ? `"${pendingAction.eventTitle}" sẽ hiển thị trên feed sự kiện công khai.`
                : pendingAction?.action === 'unpublish'
                  ? `"${pendingAction.eventTitle}" sẽ ẩn khỏi feed công khai cho đến khi xuất bản lại.`
                  : `"${pendingAction?.eventTitle}" sẽ bị xóa khỏi quản trị và feed công khai.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingAction}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction?.action === 'delete'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : undefined
              }
              disabled={isConfirmingAction}
              onClick={confirmPendingAction}
            >
              {pendingAction?.action === 'publish'
                ? 'Xuất bản'
                : pendingAction?.action === 'unpublish'
                  ? 'Chuyển về nháp'
                  : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
