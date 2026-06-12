import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { assetsApi } from '@/services/assets/assets-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { lessonsApi } from '@/services/lms/lms-api';
import type { LessonUpsertRequest } from '@/services/types/domain';

export function LessonDetailPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const lessonQuery = useQuery({
    queryKey: queryKeys.lessons.detail(lessonId ?? ''),
    queryFn: () => lessonsApi.getById(lessonId!),
    enabled: Boolean(lessonId),
  });

  const [form, setForm] = useState<LessonUpsertRequest>({
    chapterId: '',
    type: 'VIDEO',
    title: '',
    description: '',
    orderIndex: 0,
    isHidden: false,
    isOptional: false,
    contentData: {},
  });

  useEffect(() => {
    const lesson = lessonQuery.data;
    if (lesson) {
      setForm({
        chapterId: lesson.chapterId,
        type: lesson.type,
        title: lesson.title,
        description: lesson.description ?? '',
        orderIndex: lesson.orderIndex,
        isHidden: lesson.isHidden,
        isOptional: lesson.isOptional,
        contentData: lesson.contentData ?? {},
      });
    }
  }, [lessonQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => lessonsApi.update(lessonId!, form),
    onSuccess: () => {
      toast.success('Đã cập nhật bài học.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chapters.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => lessonsApi.remove(lessonId!),
    onSuccess: () => {
      toast.success('Đã xóa bài học.');
      navigate(-1);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: () => lessonsApi.uploadFile(lessonId!, uploadFile!),
    onSuccess: () => {
      toast.success('Đã upload file.');
      setUploadFile(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.detail(lessonId!),
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const presignedMutation = useMutation({
    mutationFn: async (file: File) => {
      const presigned = await assetsApi.getPresignedUpload(file.name, file.type);
      await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      return presigned;
    },
    onSuccess: (presigned) => {
      toast.success(`Presigned upload OK: ${presigned.publicId}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const fileAttachment = lessonQuery.data?.contentData?.fileAttachment as
    | { publicId?: string; fileName?: string; url?: string }
    | undefined;

  const downloadAssetMutation = useMutation({
    mutationFn: (key: string) => assetsApi.getPresignedDownload(key),
    onSuccess: (url) => {
      window.open(url, '_blank');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (key: string) => assetsApi.remove(key),
    onSuccess: () => {
      toast.success('Đã xóa file trên storage.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const lesson = lessonQuery.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 size-4" />
        Quay lại
      </Button>

      <PageHeader
        title={lesson?.title ?? 'Bài học'}
        description={lesson?.chapterTitle}
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="mr-2 size-4" />
            Xóa
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin bài học</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tiêu đề</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">VIDEO</SelectItem>
                  <SelectItem value="ARTICLE">ARTICLE</SelectItem>
                  <SelectItem value="QUIZ">QUIZ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thứ tự</Label>
              <Input
                type="number"
                value={form.orderIndex}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orderIndex: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <Switch
                checked={form.isHidden}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isHidden: checked }))
                }
              />
              Ẩn bài học
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={form.isOptional}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isOptional: checked }))
                }
              />
              Tùy chọn
            </label>
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload file bài học</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!uploadFile || uploadMutation.isPending}
              onClick={() => uploadFile && uploadMutation.mutate()}
            >
              <Upload className="mr-2 size-4" />
              Upload trực tiếp
            </Button>
            <Button
              variant="outline"
              disabled={!uploadFile || presignedMutation.isPending}
              onClick={() => uploadFile && presignedMutation.mutate(uploadFile)}
            >
              Presigned upload
            </Button>
          </div>
          {fileAttachment?.url || fileAttachment?.publicId ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                File đính kèm: {fileAttachment.fileName ?? fileAttachment.publicId}
              </p>
              <div className="flex flex-wrap gap-2">
                {fileAttachment.url ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={String(fileAttachment.url)} target="_blank">
                      Mở URL
                    </Link>
                  </Button>
                ) : null}
                {fileAttachment.publicId ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        downloadAssetMutation.mutate(fileAttachment.publicId!)
                      }
                    >
                      Tải presigned
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Xóa file trên storage?')) {
                          deleteAssetMutation.mutate(fileAttachment.publicId!);
                        }
                      }}
                    >
                      Xóa asset
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : lesson?.contentData?.url ? (
            <p className="text-muted-foreground text-sm">
              File hiện tại:{' '}
              <Link to={String(lesson.contentData.url)} target="_blank" className="underline">
                {String(lesson.contentData.url)}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
