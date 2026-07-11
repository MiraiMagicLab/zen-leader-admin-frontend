import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BellRing, Send } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
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
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { notificationsApi } from '@/services/notifications/notifications-api';

const NOTIFICATION_TYPES = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'DASHBOARD', label: 'Dashboard' },
  { value: 'COURSE', label: 'Course' },
  { value: 'EVENT', label: 'Event' },
  { value: 'PAYMENT', label: 'Payment' },
] as const;

/**
 * Admin broadcast notifications — all active users, filtered by notification type only.
 */
export function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>(NOTIFICATION_TYPES[0].value);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const broadcastMutation = useMutation({
    mutationFn: () =>
      notificationsApi.broadcast({
        title: title.trim(),
        message: message.trim(),
        type,
      }),
    onSuccess: (result) => {
      toast.success(`Sent to ${result.sentCount} user(s).`);
      setTitle('');
      setMessage('');
      setConfirmOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const canSend = title.trim().length > 0 && message.trim().length > 0;

  return (
    <AdminPageShell
      title="Notifications"
      description="Broadcast in-app notifications to all active users. Choose a type so clients can filter and display them correctly."
    >
      <div className="admin-panel mx-auto max-w-2xl p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <BellRing className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold">Send broadcast</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Messages go to every active user. Per-user targeting is not supported — use type to
              group notifications on the client.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">All active users</Badge>
              <span className="text-muted-foreground text-xs">Broadcast only</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="notification-type" className="w-full sm:w-56">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Clients use this to categorize notifications (system, course, payment, etc.).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. New course available"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the notification body…"
              rows={5}
              maxLength={2000}
            />
            <p className="text-muted-foreground text-right text-xs">{message.length}/2000</p>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button disabled={!canSend} onClick={() => setConfirmOpen(true)}>
              <Send className="mr-2 size-4" />
              Send broadcast
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to all users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a <strong>{type}</strong> notification titled &quot;{title.trim()}
              &quot; for every active user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={broadcastMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={broadcastMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                broadcastMutation.mutate();
              }}
            >
              {broadcastMutation.isPending ? 'Sending…' : 'Send now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
