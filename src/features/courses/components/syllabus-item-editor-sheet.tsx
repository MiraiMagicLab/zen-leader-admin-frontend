import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronDown } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import {
  uploadSyllabusVideo,
  VideoUploadField,
} from '@/components/admin/video-upload-field';
import type { MultipartUploadProgress } from '@/lib/multipart-upload';

import { RichTextEditor } from '@/components/rich-text-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query-keys';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { cn } from '@/lib/utils';
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
  ARTICLE: 'Article',
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<MultipartUploadProgress | null>(null);

  const syncedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      syncedKeyRef.current = null;
      return;
    }
    if (isEdit && itemQuery.data) {
      const item = itemQuery.data;
      const key = `edit:${item.id}`;
      if (syncedKeyRef.current === key) {
        return;
      }
      syncedKeyRef.current = key;
      const content = item.contentData ?? {};
      setTitle(item.title);
      setDescription(item.description ?? '');
      setType(normalizeItemType(item.type));
      setVideoFile(null);
      setBody(readContentField(content, 'body', 'content'));
      setIsHidden(item.isHidden ?? false);
      setIsOptional(item.isOptional ?? false);
      setTouched({});
      return;
    }
    if (!isEdit) {
      const key = `new:${defaultType}`;
      if (syncedKeyRef.current === key) {
        return;
      }
      syncedKeyRef.current = key;
      setTitle('');
      setDescription('');
      setType(defaultType);
      setVideoFile(null);
      setBody('');
      setIsHidden(false);
      setIsOptional(false);
      setTouched({});
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
        throw new Error('Please enter a lesson title.');
      }

      const itemType = type.toUpperCase();
      if (itemType === 'VIDEO') {
        if (!videoFile && !existingVideoAttachment) {
          throw new Error('Please select a video file.');
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
        await uploadSyllabusVideo(savedId, videoFile, setUploadProgress);
      }
    },
    onSuccess: async () => {
      setUploadProgress(null);
      toast.success(isEdit ? 'Lesson saved.' : 'Lesson created.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      setUploadProgress(null);
      toast.error(getApiErrorMessage(error));
    },
  });

  const itemType = type.toUpperCase();

  const isDirty = (() => {
    if (!open) {
      return false;
    }
    if (videoFile) {
      return true;
    }
    if (isEdit) {
      const item = itemQuery.data;
      if (!item) {
        return false;
      }
      return (
        title !== item.title ||
        description !== (item.description ?? '') ||
        type !== normalizeItemType(item.type) ||
        body !== readContentField(item.contentData ?? {}, 'body', 'content') ||
        isHidden !== (item.isHidden ?? false) ||
        isOptional !== (item.isOptional ?? false)
      );
    }
    return (
      title.trim().length > 0 ||
      description.trim().length > 0 ||
      body.trim().length > 0 ||
      type !== defaultType ||
      isHidden ||
      isOptional
    );
  })();

  useBeforeUnload(open && isDirty);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmDiscard(isDirty)) {
      return;
    }
    onOpenChange(next);
  };

  const titleError = touched.title && !title.trim() ? 'Lesson title is required.' : null;
  const videoError =
    itemType === 'VIDEO' && touched.video && !videoFile && !existingVideoAttachment
      ? 'Please select a video file.'
      : null;
  const requiredFilled =
    title.trim().length > 0 &&
    (itemType !== 'VIDEO' || Boolean(videoFile) || Boolean(existingVideoAttachment));

  return (
    <AdminEditorDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? 'Edit lesson' : 'Add lesson'}
      description={sectionTitle ? `Chapter: ${sectionTitle}` : undefined}
      size="lg"
      footer={
        <AdminFormDialogFooter
          onCancel={() => handleOpenChange(false)}
          submitLabel={isEdit ? 'Save' : 'Create lesson'}
          onSubmit={() => {
            setTouched({ title: true, video: true });
            saveMutation.mutate();
          }}
          pending={saveMutation.isPending}
          disabled={(isEdit && itemQuery.isLoading) || !requiredFilled}
        />
      }
    >
      <div className="space-y-6">
        {isEdit && itemQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading lesson…
          </div>
        ) : (
          <>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Basic info</p>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <Label>
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={title}
                    placeholder="e.g. Session 1 — Introduction to Zen Leader"
                    aria-invalid={Boolean(titleError)}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (touched.title && e.target.value.trim()) {
                        setTouched((prev) => ({ ...prev, title: false }));
                      }
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                  />
                  {titleError ? (
                    <p className="text-destructive text-sm">{titleError}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
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
                    <Label>Short description</Label>
                    <Input
                      value={description}
                      placeholder="Optional"
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">Brief summary shown in the lesson list.</p>
                  </div>
                </div>
              </div>
            </div>

            {itemType === 'VIDEO' ? (
              <div>
                <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
                  Video
                </p>
                <VideoUploadField
                  file={videoFile}
                  onFileChange={setVideoFile}
                  existingAttachment={existingVideoAttachment}
                  error={videoError ?? undefined}
                  touched={touched.video}
                  onBlur={() => setTouched((prev) => ({ ...prev, video: true }))}
                  isUploading={saveMutation.isPending}
                  uploadProgress={uploadProgress}
                />
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Article content</p>
                <div className="mt-3 space-y-2">
                  <RichTextEditor
                    value={body}
                    minHeight="12rem"
                    placeholder="Compose content shown in app…"
                    onChange={setBody}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex w-full items-center justify-between p-3 text-left text-sm font-medium"
                >
                  <span>Advanced options</span>
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform duration-200',
                      advancedOpen && 'rotate-180',
                    )}
                  />
                </button>

                {advancedOpen && (
                  <div className="border-t p-3 bg-muted/10 space-y-3 animate-in fade-in-50 duration-200">
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <Switch checked={isHidden} onCheckedChange={setIsHidden} />
                        <span>Hidden from students</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <Switch checked={isOptional} onCheckedChange={setIsOptional} />
                        <span>Optional lesson</span>
                      </label>
                    </div>
                    {isEdit ? (
                      <p className="text-muted-foreground text-xs">
                        Current type: {TYPE_LABELS[itemType] ?? itemType}.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminEditorDialog>
  );
}
