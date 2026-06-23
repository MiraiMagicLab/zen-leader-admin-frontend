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
import { RichTextEditor } from '@/components/rich-text-editor';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { useAdminPageMeta } from '@/lib/page-meta';
import { assetsApi } from '@/services/assets/assets-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { syllabusItemsApi } from '@/services/lms/lms-api';
import type { SyllabusItemUpsertRequest } from '@/services/types/domain';

function readContentField(
  data: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = data[key];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}

function patchContentData(
  data: Record<string, unknown>,
  patch: Record<string, string | number | undefined>,
): Record<string, unknown> {
  const next = { ...data };
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
}

export function SyllabusItemDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.syllabusItem);

  const { itemId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const itemQuery = useQuery({
    queryKey: queryKeys.syllabusItems.detail(itemId ?? ''),
    queryFn: () => syllabusItemsApi.getById(itemId!),
    enabled: Boolean(itemId),
  });

  const [form, setForm] = useState<SyllabusItemUpsertRequest>({
    syllabusSectionId: '',
    type: 'VIDEO',
    title: '',
    description: '',
    orderIndex: 0,
    isHidden: false,
    isOptional: false,
    contentData: {},
  });

  useEffect(() => {
    const item = itemQuery.data;
    if (item) {
      setForm({
        syllabusSectionId: item.syllabusSectionId,
        type: item.type.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'ARTICLE',
        title: item.title,
        description: item.description ?? '',
        orderIndex: item.orderIndex,
        isHidden: item.isHidden,
        isOptional: item.isOptional,
        contentData: item.contentData ?? {},
      });
    }
  }, [itemQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => syllabusItemsApi.update(itemId!, form),
    onSuccess: () => {
      toast.success('Syllabus item updated.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusItems.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => syllabusItemsApi.remove(itemId!),
    onSuccess: () => {
      toast.success('Syllabus item deleted.');
      navigate(-1);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: () => syllabusItemsApi.uploadFile(itemId!, uploadFile!),
    onSuccess: () => {
      toast.success('File uploaded.');
      setUploadFile(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.syllabusItems.detail(itemId!),
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
    onSuccess: () => {
      toast.success('File uploaded and ready to use.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const fileAttachment = itemQuery.data?.contentData?.fileAttachment as
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
      toast.success('File deleted from storage.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const item = itemQuery.data;
  const contentData = form.contentData ?? {};

  const setContentField = (key: string, value: string | number | undefined) => {
    setForm((f) => ({
      ...f,
      contentData: patchContentData(f.contentData ?? {}, { [key]: value }),
    }));
  };

  const itemType = form.type.toUpperCase();
  const articleBody = readContentField(contentData, 'body', 'content');
  const videoUrl = readContentField(
    contentData,
    'videoUrl',
    'video_url',
    'fileUrl',
  );
  const durationMinutes = readContentField(
    contentData,
    'durationMinutes',
    'duration_minutes',
  );
  const thumbnailUrl = readContentField(
    contentData,
    'thumbnailUrl',
    'thumbnail_url',
    'coverUrl',
    'cover_url',
  );
  const quote = readContentField(contentData, 'quote');
  const imageUrl = readContentField(contentData, 'imageUrl', 'image_url');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 size-4" />
        Back
      </Button>

      <PageHeader
        title={item?.title ?? 'Syllabus Item'}
        description={item?.syllabusSectionTitle}
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Syllabus Item Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Short description</Label>
            <Textarea
              value={form.description ?? ''}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Summary shown in lists"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="ARTICLE">Article</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
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
              Hidden
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={form.isOptional}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isOptional: checked }))
                }
              />
              Optional
            </label>
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage the lesson content shown to learners in the app.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemType === 'ARTICLE' ? (
            <>
              <div className="space-y-2">
                <Label>Article content</Label>
                <RichTextEditor
                  value={articleBody}
                  onChange={(body) => {
                    setForm((f) => ({
                      ...f,
                      contentData: patchContentData(f.contentData ?? {}, {
                        body,
                        content: body,
                      }),
                    }));
                  }}
                  placeholder="Compose content shown in app (HTML)…"
                  minHeight="16rem"
                />
                <p className="text-muted-foreground text-xs">
                  Mobile shows <strong>body</strong> first; if empty, falls back to
                  the short description above.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Quote</Label>
                <Input
                  value={quote}
                  onChange={(e) => setContentField('quote', e.target.value)}
                  placeholder="Featured quote (optional)"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Illustration (imageUrl)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setContentField('imageUrl', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cover image (coverUrl / thumbnailUrl)</Label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm((f) => ({
                        ...f,
                        contentData: patchContentData(f.contentData ?? {}, {
                          coverUrl: url,
                          thumbnailUrl: url,
                        }),
                      }));
                    }}
                    placeholder="https://…"
                  />
                </div>
              </div>
            </>
          ) : null}

          {itemType === 'VIDEO' ? (
            <>
              <div className="space-y-2">
                <Label>Local video</Label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {uploadFile ? (
                  <p className="text-muted-foreground text-xs">
                    Selected: {uploadFile.name} — click Upload to push to R2.
                  </p>
                ) : fileAttachment?.url ? (
                  <p className="text-muted-foreground text-xs">
                    Current video: {fileAttachment.fileName ?? fileAttachment.url}
                  </p>
                ) : videoUrl ? (
                  <p className="text-muted-foreground text-xs">
                    Current video link: {videoUrl}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Select a local video file and upload — app reads{' '}
                    <strong>fileAttachment.url</strong>.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={durationMinutes}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setContentField(
                        'durationMinutes',
                        raw === '' ? undefined : Number(raw),
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail URL</Label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) =>
                      setContentField('thumbnailUrl', e.target.value)
                    }
                    placeholder="https://…"
                  />
                </div>
              </div>
            </>
          ) : null}

          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            Save content
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload file</CardTitle>
          <p className="text-muted-foreground text-sm">
            Optional — attach file to <code className="text-xs">contentData.fileAttachment</code>{' '}
            (video/PDF…). Does not replace the ARTICLE content above.
          </p>
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
              Upload file
            </Button>
            <Button
              variant="outline"
              disabled={!uploadFile || presignedMutation.isPending}
              onClick={() => uploadFile && presignedMutation.mutate(uploadFile)}
            >
              Upload with secure link
            </Button>
          </div>
          {fileAttachment?.url || fileAttachment?.publicId ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                Attached file: {fileAttachment.fileName ?? fileAttachment.publicId}
              </p>
              <div className="flex flex-wrap gap-2">
                {fileAttachment.url ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={String(fileAttachment.url)} target="_blank">
                      Open URL
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
                      Open secure download link
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Delete file from storage?')) {
                          deleteAssetMutation.mutate(fileAttachment.publicId!);
                        }
                      }}
                    >
                      Remove file
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : item?.contentData?.url ? (
            <p className="text-muted-foreground text-sm">
              Current file:{' '}
              <Link to={String(item.contentData.url)} target="_blank" className="underline">
                {String(item.contentData.url)}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
