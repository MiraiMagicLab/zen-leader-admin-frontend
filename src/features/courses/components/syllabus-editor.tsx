import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CopyPlus,
  FileText,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { SyllabusItemEditorSheet } from '@/features/courses/components/syllabus-item-editor-sheet';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { queryKeys } from '@/hooks/query-keys';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { syllabusItemsApi, syllabusSectionsApi } from '@/services/lms/lms-api';
import type { SyllabusItemResponse, SyllabusSectionResponse } from '@/services/types/domain';

type Props = {
  courseId: string;
  courseTitle?: string;
  initialItemId?: string | null;
  onInitialItemHandled?: () => void;
};

type ItemEditorState = {
  sectionId: string;
  sectionTitle: string;
  itemId?: string | null;
  defaultType?: string;
};

type DeleteTarget =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'item'; id: string; title: string };

const TYPE_ICONS: Record<string, typeof PlayCircle> = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
};

function typeLabel(type: string) {
  return type.toUpperCase() === 'VIDEO' ? 'Video' : 'Article';
}

export function SyllabusEditor({
  courseId,
  courseTitle,
  initialItemId,
  onInitialItemHandled,
}: Props) {
  const queryClient = useQueryClient();
  const [sectionSheetOpen, setSectionSheetOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [editSection, setEditSection] = useState<SyllabusSectionResponse | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const sectionsQuery = useQuery({
    queryKey: queryKeys.syllabusSections.list(courseId),
    queryFn: () => syllabusSectionsApi.getPage(0, 100, courseId),
    enabled: Boolean(courseId),
  });

  const sections = sectionsQuery.data?.data ?? [];
  const totalItems = sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) }),
    ]);
  };

  const createSectionMutation = useMutation({
    mutationFn: () => {
      const title = sectionTitle.trim() || `Chapter ${sections.length + 1}`;
      return syllabusSectionsApi.create({
        courseId,
        title,
        orderIndex: sections.length,
      });
    },
    onSuccess: async (created) => {
      toast.success('Chapter created.');
      setSectionSheetOpen(false);
      setSectionTitle('');
      await invalidate();
      setItemEditor({
        sectionId: created.id,
        sectionTitle: created.title,
        defaultType: 'VIDEO',
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateSectionMutation = useMutation({
    mutationFn: () =>
      syllabusSectionsApi.update(editSection!.id, {
        courseId,
        title: editSection!.title,
        orderIndex: editSection!.orderIndex,
      }),
    onSuccess: async () => {
      toast.success('Chapter updated.');
      setEditSection(null);
      await invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => syllabusSectionsApi.remove(sectionId),
    onSuccess: async () => {
      toast.success('Chapter deleted.');
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => syllabusItemsApi.remove(itemId),
    onSuccess: async () => {
      toast.success('Lesson deleted.');
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const duplicateSectionMutation = useMutation({
    mutationFn: (sectionId: string) => syllabusSectionsApi.duplicate(sectionId),
    onSuccess: async (created) => {
      toast.success(`Chapter duplicated as "${created.title}".`);
      await invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const duplicateItemMutation = useMutation({
    mutationFn: (itemId: string) => syllabusItemsApi.duplicate(itemId),
    onSuccess: async (created) => {
      toast.success(`Lesson duplicated as "${created.title}".`);
      await invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openAddItem = (section: SyllabusSectionResponse, defaultType = 'VIDEO') => {
    setItemEditor({
      sectionId: section.id,
      sectionTitle: section.title,
      defaultType,
    });
  };

  const openEditItem = (section: SyllabusSectionResponse, item: SyllabusItemResponse) => {
    setItemEditor({
      sectionId: section.id,
      sectionTitle: section.title,
      itemId: item.id,
    });
  };

  useEffect(() => {
    if (!initialItemId || sectionsQuery.isLoading || itemEditor) {
      return;
    }

    for (const section of sections) {
      const item = section.items?.find((entry) => entry.id === initialItemId);
      if (item) {
        openEditItem(section, item);
        onInitialItemHandled?.();
        return;
      }
    }

    if (!sectionsQuery.isFetching) {
      onInitialItemHandled?.();
    }
  }, [
    initialItemId,
    sections,
    sectionsQuery.isLoading,
    sectionsQuery.isFetching,
    itemEditor,
    onInitialItemHandled,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Course syllabus</p>
          <p className="text-muted-foreground text-sm">
            {courseTitle ? `${courseTitle} · ` : ''}
            {sections.length} chapters · {totalItems} lessons — shared across all runs.
          </p>
        </div>
        <Button size="sm" onClick={() => setSectionSheetOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add chapter
        </Button>
      </div>

      {sectionsQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading syllabus…</CardContent>
        </Card>
      ) : sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BookOpen className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">No syllabus yet</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Create the first chapter, then add lessons (video, article, quiz) right within the
                same form — no page navigation needed.
              </p>
            </div>
            <Button onClick={() => setSectionSheetOpen(true)}>
              <Plus className="mr-2 size-4" />
              Get started — create first chapter
            </Button>
          </CardContent>
        </Card>
      ) : (
        sections.map((section) => {
          const items = section.items ?? [];
          return (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">{items.length} lessons</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => openAddItem(section)}>
                    <Plus className="mr-1 size-4" />
                    Lesson
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={duplicateSectionMutation.isPending}
                        onClick={() => duplicateSectionMutation.mutate(section.id)}
                      >
                        <CopyPlus className="mr-2 size-4" />
                        Duplicate chapter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditSection(section)}>
                        <Pencil className="mr-2 size-4" />
                        Rename chapter
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'section',
                            id: section.id,
                            title: section.title,
                          })
                        }
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete chapter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-muted-foreground text-sm">This chapter has no lessons yet.</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openAddItem(section, 'VIDEO')}>
                        + Video
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openAddItem(section, 'ARTICLE')}>
                        + Article
                      </Button>
                    </div>
                  </div>
                ) : (
                  items.map((item) => {
                    const Icon = TYPE_ICONS[item.type.toUpperCase()] ?? FileText;
                    return (
                      <div
                        key={item.id}
                        className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                          <Icon className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {typeLabel(item.type)}
                            </Badge>
                            {item.isHidden ? (
                              <Badge variant="outline" className="text-xs">
                                Hidden
                              </Badge>
                            ) : null}
                            {item.isOptional ? (
                              <Badge variant="outline" className="text-xs">
                                Optional
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditItem(section, item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={duplicateItemMutation.isPending}
                            onClick={() => duplicateItemMutation.mutate(item.id)}
                          >
                            <CopyPlus className="mr-1 size-3.5" />
                            Duplicate
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'item',
                                id: item.id,
                                title: item.title,
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={sectionSheetOpen} onOpenChange={setSectionSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Chapter name</Label>
            <Input
              autoFocus
              value={sectionTitle}
              placeholder={`Chapter ${sections.length + 1}`}
              onChange={(e) => setSectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createSectionMutation.mutate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createSectionMutation.mutate()}
              disabled={createSectionMutation.isPending}
            >
              Create & add lessons
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSection)} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename chapter</DialogTitle>
          </DialogHeader>
          {editSection ? (
            <div className="space-y-2">
              <Label>Chapter name</Label>
              <Input
                autoFocus
                value={editSection.title}
                onChange={(e) =>
                  setEditSection((current) =>
                    current ? { ...current, title: e.target.value } : current,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateSectionMutation.mutate();
                  }
                }}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => updateSectionMutation.mutate()}
              disabled={!editSection?.title.trim() || updateSectionMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {itemEditor ? (
        <SyllabusItemEditorSheet
          open={Boolean(itemEditor)}
          onOpenChange={(open) => {
            if (!open) {
              setItemEditor(null);
            }
          }}
          courseId={courseId}
          syllabusSectionId={itemEditor.sectionId}
          sectionTitle={itemEditor.sectionTitle}
          itemId={itemEditor.itemId}
          defaultType={itemEditor.defaultType}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget?.kind === 'section' ? 'Delete chapter?' : 'Delete lesson?'}
        description={
          deleteTarget?.kind === 'section' ? (
            <>
              Delete &quot;{deleteTarget.title}&quot; and all lessons inside this chapter. This
              cannot be undone.
            </>
          ) : (
            <>Delete &quot;{deleteTarget?.title}&quot;. This cannot be undone.</>
          )
        }
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          if (deleteTarget.kind === 'section') {
            deleteSectionMutation.mutate(deleteTarget.id);
          } else {
            deleteItemMutation.mutate(deleteTarget.id);
          }
        }}
        pending={deleteSectionMutation.isPending || deleteItemMutation.isPending}
      />
    </div>
  );
}
