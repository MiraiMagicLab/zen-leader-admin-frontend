import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { RichTextEditor } from '@/components/rich-text-editor';
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query-keys';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { syllabusItemsApi, syllabusSectionsApi } from '@/services/lms/lms-api';
import type { SyllabusItemUpsertRequest } from '@/services/types/domain';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  syllabusSectionId: string;
  sectionTitle?: string;
  itemId?: string | null;
  defaultType?: string;
};

function readContentField(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}

function buildArticleContentData(body: string): Record<string, unknown> | undefined {
  return body.trim() ? { body, content: body } : undefined;
}

function readFileAttachment(
  content: Record<string, unknown>,
): { fileName?: string; url?: string } | null {
  const attachment = content.fileAttachment;
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }
  const record = attachment as Record<string, unknown>;
  const url = record.url != null ? String(record.url).trim() : '';
  if (!url) {
    return null;
  }
  return {
    url,
    fileName: record.fileName != null ? String(record.fileName) : undefined,
  };
}

const TYPE_LABELS: Record<string, string> = {
  VIDEO: 'Video',
  ARTICLE: 'Bài viết',
};

function normalizeItemType(type: string): string {
  const normalized = type.toUpperCase();
  return normalized === 'VIDEO' ? 'VIDEO' : 'ARTICLE';
}

export function SyllabusItemEditorSheet({
  open,
  onOpenChange,
  courseId,
  syllabusSectionId,
  sectionTitle,
  itemId,
  defaultType = 'VIDEO',
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(itemId);

  const itemQuery = useQuery({
    queryKey: queryKeys.syllabusItems.detail(itemId ?? ''),
    queryFn: () => syllabusItemsApi.getById(itemId!),
    enabled: open && isEdit,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(defaultType);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [body, setBody] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [isOptional, setIsOptional] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isEdit && itemQuery.data) {
      const item = itemQuery.data;
      const content = item.contentData ?? {};
      setTitle(item.title);
      setDescription(item.description ?? '');
      setType(normalizeItemType(item.type));
      setVideoFile(null);
      setBody(readContentField(content, 'body', 'content'));
      setIsHidden(item.isHidden ?? false);
      setIsOptional(item.isOptional ?? false);
      return;
    }
    if (!isEdit) {
      setTitle('');
      setDescription('');
      setType(defaultType);
      setVideoFile(null);
      setBody('');
      setIsHidden(false);
      setIsOptional(false);
    }
  }, [open, isEdit, itemQuery.data, defaultType]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusItems.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) }),
    ]);
  };

  const existingVideoAttachment = isEdit
    ? readFileAttachment(itemQuery.data?.contentData ?? {})
    : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error('Vui lòng nhập tiêu đề bài học.');
      }

      const itemType = type.toUpperCase();
      if (itemType === 'VIDEO') {
        if (!videoFile && !existingVideoAttachment) {
          throw new Error('Vui lòng chọn file video từ máy.');
        }
      }

      let contentData: Record<string, unknown> | undefined;
      if (itemType === 'ARTICLE') {
        contentData = buildArticleContentData(body);
      } else if (isEdit && itemQuery.data?.contentData) {
        contentData = itemQuery.data.contentData;
      }

      const payload: SyllabusItemUpsertRequest = {
        syllabusSectionId,
        type: itemType,
        title: trimmedTitle,
        description: description.trim() || null,
        orderIndex: isEdit ? (itemQuery.data?.orderIndex ?? 0) : 0,
        isHidden,
        isOptional,
        contentData,
      };

      let savedId: string;
      if (isEdit && itemId) {
        payload.orderIndex = itemQuery.data?.orderIndex ?? 0;
        await syllabusItemsApi.update(itemId, payload);
        savedId = itemId;
      } else {
        const sectionsPage = await syllabusSectionsApi.getPage(0, 100, courseId);
        const existingSection = sectionsPage.data?.find((s) => s.id === syllabusSectionId);
        payload.orderIndex = existingSection?.items?.length ?? 0;
        const created = await syllabusItemsApi.create(payload);
        savedId = created.id;
      }

      if (itemType === 'VIDEO' && videoFile) {
        await syllabusItemsApi.uploadFile(savedId, videoFile);
      }
    },
    onSuccess: async () => {
      toast.success(isEdit ? 'Đã lưu bài học.' : 'Đã tạo bài học.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const itemType = type.toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[640px] sm:max-w-[640px]">
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
          <SheetTitle>{isEdit ? 'Sửa bài học' : 'Thêm bài học'}</SheetTitle>
          {sectionTitle ? (
            <p className="text-muted-foreground text-sm">Chương: {sectionTitle}</p>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label>Tiêu đề *</Label>
            <Input
              value={title}
              placeholder="VD: Buổi 1 — Giới thiệu Zen Leader"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="ARTICLE">Bài viết</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mô tả ngắn</Label>
              <Input
                value={description}
                placeholder="Tuỳ chọn"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {itemType === 'VIDEO' ? (
            <div className="space-y-2">
              <Label>Video từ máy *</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              {videoFile ? (
                <p className="text-muted-foreground text-xs">
                  Đã chọn: {videoFile.name} ({Math.round(videoFile.size / 1024 / 1024)} MB)
                </p>
              ) : existingVideoAttachment ? (
                <p className="text-muted-foreground text-xs">
                  Video hiện tại:{' '}
                  {existingVideoAttachment.fileName ?? existingVideoAttachment.url}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Chọn file video trên máy — hệ thống upload lên R2 và gắn vào bài học.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Nội dung bài viết</Label>
              <RichTextEditor
                value={body}
                minHeight="12rem"
                placeholder="Soạn nội dung hiển thị trên app…"
                onChange={setBody}
              />
            </div>
          )}

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">Tuỳ chọn nâng cao</summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={isHidden} onCheckedChange={setIsHidden} />
                  Ẩn với học viên
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={isOptional} onCheckedChange={setIsOptional} />
                  Bài tuỳ chọn
                </label>
              </div>
              {isEdit ? (
                <p className="text-muted-foreground text-xs">
                  Loại hiện tại: {TYPE_LABELS[itemType] ?? itemType}.
                </p>
              ) : null}
            </div>
          </details>
        </div>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (isEdit && itemQuery.isLoading)}
          >
            {isEdit ? 'Lưu' : 'Tạo bài học'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
