import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { notificationsApi } from '@/services/notifications/notifications-api';

export function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [userIds, setUserIds] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: () =>
      notificationsApi.broadcast({
        title,
        message,
        type,
        userIds: userIds.trim()
          ? userIds.split(',').map((id) => id.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: (result) => {
      toast.success(`Sent ${result.sentCount} notifications.`);
      setTitle('');
      setMessage('');
      setUserIds('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Send system notifications to specific users or all users."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Broadcast notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>User IDs (optional, comma-separated)</Label>
            <Input
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="Leave empty = send to all users"
            />
          </div>
          <Button
            disabled={!title || !message || broadcastMutation.isPending}
            onClick={() => broadcastMutation.mutate()}
          >
            <Send className="mr-2 size-4" />
            Send notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
