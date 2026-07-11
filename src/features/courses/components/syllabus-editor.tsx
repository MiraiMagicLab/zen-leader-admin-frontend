import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CopyPlus,
  FileText,
  GripVertical,
  Loader2,
  MoreVertical,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { SyllabusItemEditorSheet } from '@/features/courses/components/syllabus-item-editor-sheet';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/hooks/query-keys';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
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

type SortableItemProps = {
  item: SyllabusItemResponse;
  section: SyllabusSectionResponse;
  onEdit: (section: SyllabusSectionResponse, item: SyllabusItemResponse) => void;
  onDelete: (item: SyllabusItemResponse) => void;
  onDuplicate: (itemId: string) => void;
  isDuplicatePending: boolean;
};

function SortableItem({
  item,
  section,
  onEdit,
  onDelete,
  onDuplicate,
  isDuplicatePending,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 0,
  };

  const Icon = TYPE_ICONS[item.type.toUpperCase()] ?? FileText;
  const isVideo = item.type.toUpperCase() === 'VIDEO';
  const hasContent = isVideo
    ? Boolean((item.contentData?.fileAttachment as any)?.url)
    : Boolean(String(item.contentData?.body || item.contentData?.content || '').trim());

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <button
        type="button"
        className="bg-muted flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md hover:bg-accent active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-muted-foreground size-4" />
      </button>
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
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
          {hasContent ? (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 text-xs py-0 h-5"
            >
              {isVideo ? 'Video Uploaded' : 'Content Ready'}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 bg-amber-50/50 dark:text-amber-400 dark:border-amber-900/50 text-xs py-0 h-5"
            >
              {isVideo ? 'Missing Video' : 'Empty Content'}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(section, item)}
        >
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
              <span className="sr-only">Lesson actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              disabled={isDuplicatePending}
              onClick={() => onDuplicate(item.id)}
            >
              {isDuplicatePending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CopyPlus className="mr-2 size-4" />
              )}
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type SortableSectionProps = {
  section: SyllabusSectionResponse;
  collapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onAddItem: (section: SyllabusSectionResponse, defaultType?: string) => void;
  onEditItem: (section: SyllabusSectionResponse, item: SyllabusItemResponse) => void;
  onEditSection: (section: SyllabusSectionResponse) => void;
  onDeleteSection: (section: SyllabusSectionResponse) => void;
  onDeleteItem: (item: SyllabusItemResponse) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onReorderItems: (sectionId: string, itemIds: string[]) => void;
  isDuplicateSectionPending: boolean;
  isDuplicateItemPending: boolean;
};

function SortableSection({
  section,
  collapsed,
  onToggleCollapse,
  onAddItem,
  onEditItem,
  onEditSection,
  onDeleteSection,
  onDeleteItem,
  onDuplicateSection,
  onDuplicateItem,
  onReorderItems,
  isDuplicateSectionPending,
  isDuplicateItemPending,
}: SortableSectionProps) {
  const items = section.items ?? [];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 0,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleItemDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorderItems(section.id, reordered.map((i) => i.id));
    },
    [items, section.id, onReorderItems],
  );

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="bg-muted mt-1 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md hover:bg-accent active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="text-muted-foreground size-4" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
            onClick={() => onToggleCollapse(section.id)}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          <div>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">{items.length} lessons</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onAddItem(section)}>
            <Plus className="mr-1 size-4" />
            Add Lesson
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
                <span className="sr-only">Chapter actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                disabled={isDuplicateSectionPending}
                onClick={() => onDuplicateSection(section.id)}
              >
                {isDuplicateSectionPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CopyPlus className="mr-2 size-4" />
                )}
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditSection(section)}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDeleteSection(section)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <div className="collapsible-content" data-state={collapsed ? 'closed' : 'open'}>
      <CardContent className="space-y-2 pt-0">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-sm">This chapter has no lessons yet.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => onAddItem(section, 'VIDEO')}>
                <PlayCircle className="mr-1 size-3.5" />
                Video
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onAddItem(section, 'ARTICLE')}>
                <FileText className="mr-1 size-3.5" />
                Article
              </Button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    section={section}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onDuplicate={onDuplicateItem}
                    isDuplicatePending={isDuplicateItemPending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
      </div>
    </Card>
  );
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
  const [sectionTitleTouched, setSectionTitleTouched] = useState(false);
  const [editSection, setEditSection] = useState<SyllabusSectionResponse | null>(null);
  const [editSectionOriginalTitle, setEditSectionOriginalTitle] = useState('');
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionIds: string[]) => syllabusSectionsApi.reorder(sectionIds),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const reorderItemsMutation = useMutation({
    mutationFn: (itemIds: string[]) => syllabusItemsApi.reorder(itemIds),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

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
      setSectionTitleTouched(false);
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
      toast.success('Chapter renamed.');
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

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sections, oldIndex, newIndex);
    const sectionIds = reordered.map((s) => s.id);

    queryClient.setQueryData(queryKeys.syllabusSections.list(courseId), (old: Awaited<ReturnType<typeof syllabusSectionsApi.getPage>>) => {
      if (!old) return old;
      return { ...old, data: reordered };
    });

    reorderSectionsMutation.mutate(sectionIds);
  };

  const handleItemReorder = useCallback(
    (sectionId: string, itemIds: string[]) => {
      queryClient.setQueryData(queryKeys.syllabusSections.list(courseId), (old: Awaited<ReturnType<typeof syllabusSectionsApi.getPage>>) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((section) => {
            if (section.id !== sectionId) return section;
            const itemMap = new Map(section.items.map((i) => [i.id, i]));
            return {
              ...section,
              items: itemIds.map((id) => itemMap.get(id)!).filter(Boolean),
            };
          }),
        };
      });

      reorderItemsMutation.mutate(itemIds);
    },
    [courseId, queryClient, reorderItemsMutation],
  );

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const addChapterDirty = sectionSheetOpen && sectionTitle.trim().length > 0;
  const renameChapterDirty =
    Boolean(editSection) && (editSection?.title ?? '') !== editSectionOriginalTitle;

  useBeforeUnload(addChapterDirty || renameChapterDirty);

  const handleAddChapterOpenChange = (open: boolean) => {
    if (!open && !confirmDiscard(addChapterDirty)) {
      return;
    }
    setSectionSheetOpen(open);
    if (!open) {
      setSectionTitle('');
      setSectionTitleTouched(false);
    }
  };

  const handleRenameChapterOpenChange = (open: boolean) => {
    if (!open) {
      if (!confirmDiscard(renameChapterDirty)) {
        return;
      }
      setEditSection(null);
    }
  };

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
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading syllabus…
          </CardContent>
        </Card>
      ) : sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BookOpen className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">No syllabus yet</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Create the first chapter, then add lessons (video, article) right within the
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  collapsed={collapsedSections.has(section.id)}
                  onToggleCollapse={toggleCollapse}
                  onAddItem={openAddItem}
                  onEditItem={openEditItem}
                  onEditSection={(s) => {
                    setEditSection(s);
                    setEditSectionOriginalTitle(s.title);
                  }}
                  onDeleteSection={(s) =>
                    setDeleteTarget({ kind: 'section', id: s.id, title: s.title })
                  }
                  onDeleteItem={(item) =>
                    setDeleteTarget({ kind: 'item', id: item.id, title: item.title })
                  }
                  onDuplicateSection={(id) => duplicateSectionMutation.mutate(id)}
                  onDuplicateItem={(id) => duplicateItemMutation.mutate(id)}
                  onReorderItems={handleItemReorder}
                  isDuplicateSectionPending={duplicateSectionMutation.isPending}
                  isDuplicateItemPending={duplicateItemMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={sectionSheetOpen} onOpenChange={handleAddChapterOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Chapter name <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={sectionTitle}
              placeholder={`Chapter ${sections.length + 1}`}
              aria-invalid={sectionTitleTouched && sectionTitle.trim().length > 100}
              onChange={(e) => setSectionTitle(e.target.value)}
              onBlur={() => setSectionTitleTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sectionTitle.trim()) {
                  createSectionMutation.mutate();
                }
              }}
            />
            {sectionTitleTouched && sectionTitle.trim().length > 100 ? (
              <p className="text-destructive text-sm">Chapter name must be 100 characters or fewer.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAddChapterOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSectionTitleTouched(true);
                createSectionMutation.mutate();
              }}
              disabled={createSectionMutation.isPending}
            >
              {createSectionMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSection)} onOpenChange={handleRenameChapterOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename chapter</DialogTitle>
          </DialogHeader>
          {editSection ? (
            <div className="space-y-2">
              <Label>
                Chapter name <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                value={editSection.title}
                aria-invalid={editSection.title.trim().length > 100}
                onChange={(e) =>
                  setEditSection((current) =>
                    current ? { ...current, title: e.target.value } : current,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editSection.title.trim()) {
                    updateSectionMutation.mutate();
                  }
                }}
              />
              {editSection.title.trim().length > 100 ? (
                <p className="text-destructive text-sm">Chapter name must be 100 characters or fewer.</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameChapterOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateSectionMutation.mutate()}
              disabled={!editSection?.title.trim() || updateSectionMutation.isPending}
            >
              {updateSectionMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
