import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { UserPicker } from '@/components/admin/user-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { useAdminPageMeta } from '@/lib/page-meta';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { notificationsApi } from '@/services/notifications/notifications-api';
import type { UserResponse } from '@/services/types/domain';

const NOTIFICATION_TYPES = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'LMS', label: 'Learning' },
] as const;

function typeLabel(value: string) {
  return NOTIFICATION_TYPES.find((option) => option.value === value)?.label ?? value;
}

export function NotificationsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.notifications);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [selectedUsers, setSelectedUsers] = useState<UserResponse[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targetAll = selectedUsers.length === 0;

  const broadcastMutation = useMutation({
    mutationFn: () =>
      notificationsApi.broadcast({
        title,
        message,
        type,
        userIds: targetAll ? undefined : selectedUsers.map((user) => user.id),
      }),
    onSuccess: (result) => {
      toast.success(`Sent ${result.sentCount} notifications.`);
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      setConfirmOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Send a notification to selected users, or to all users."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Recipients</p>
            <p className="mt-2 text-2xl font-semibold">
              {targetAll ? 'All users' : `${selectedUsers.length} selected`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Notification type</p>
            <p className="mt-2 text-2xl font-semibold">{typeLabel(type)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <UserPicker
              selectedUsers={selectedUsers}
              onSelectedUsersChange={setSelectedUsers}
              label="Recipients (leave empty to send to all)"
            />
          </div>

          <Button
            disabled={!title || !message || broadcastMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="mr-2 size-4" />
            Send notification
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm send</DialogTitle>
            <DialogDescription>
              {targetAll
                ? 'This notification will be sent to ALL users. This action cannot be undone.'
                : `This notification will be sent to ${selectedUsers.length} selected users.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{title || '(no title)'}</span>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                {typeLabel(type)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {message || '(no message)'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => broadcastMutation.mutate()}
              disabled={broadcastMutation.isPending}
            >
              <Send className="mr-2 size-4" />
              {targetAll ? 'Send to all' : `Send to ${selectedUsers.length} users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
