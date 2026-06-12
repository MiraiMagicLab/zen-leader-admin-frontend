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
      toast.success(`Đã gửi ${result.sentCount} thông báo.`);
      setTitle('');
      setMessage('');
      setUserIds('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Thông báo"
        description="Gửi thông báo hệ thống tới người dùng cụ thể hoặc toàn bộ user."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Broadcast thông báo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nội dung</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Loại (type)</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>User IDs (tùy chọn, phân cách bằng dấu phẩy)</Label>
            <Input
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="Để trống = gửi tất cả user"
            />
          </div>
          <Button
            disabled={!title || !message || broadcastMutation.isPending}
            onClick={() => broadcastMutation.mutate()}
          >
            <Send className="mr-2 size-4" />
            Gửi thông báo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
