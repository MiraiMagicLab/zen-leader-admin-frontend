import { useState, useId } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { UserPicker } from '@/components/admin/user-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [recipientType, setRecipientType] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<UserResponse[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const titleInputId = useId();
  const messageInputId = useId();

  const targetAll = recipientType === 'all';

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
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Send a notification to selected users, or to all users."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        <Card className="shadow-xs lg:col-span-2 pb-0 flex flex-col">
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              Write the notification title, message, and select its category type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor={titleInputId}>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id={titleInputId}
                value={title}
                placeholder="e.g. New course available"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={messageInputId}>
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={messageInputId}
                value={message}
                placeholder="Write the notification content…"
                rows={6}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 py-4 mt-auto">
            <Button
              disabled={
                !title.trim() ||
                !message.trim() ||
                (recipientType === 'specific' && selectedUsers.length === 0) ||
                broadcastMutation.isPending
              }
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="mr-2 size-4" />
              Send Notification
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xs pb-0 flex flex-col">
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>
              Select specific recipients, or choose all registered users.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex-1">
            <Tabs value={recipientType} onValueChange={(val) => setRecipientType(val as 'all' | 'specific')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="specific">Specific Users</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    This notification will be broadcast to all registered users.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="specific" className="mt-3">
                <UserPicker
                  selectedUsers={selectedUsers}
                  onSelectedUsersChange={setSelectedUsers}
                  label="Search and filter users"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t bg-muted/20 py-4 text-xs text-muted-foreground mt-auto">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">Target:</span>
              <span>
                {recipientType === 'all'
                  ? 'All users (Broadcast)'
                  : `${selectedUsers.length} selected user(s)`}
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>

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
              {broadcastMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {targetAll ? 'Send to all' : `Send to ${selectedUsers.length} users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
