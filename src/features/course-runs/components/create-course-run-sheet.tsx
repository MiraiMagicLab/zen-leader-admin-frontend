import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
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
import { mergeCourseRunPricingMetadata } from '@/lib/course-run-pricing';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { queryKeys } from '@/hooks/query-keys';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseRunResponse } from '@/services/types/domain';

type RunForm = {
  courseId: string;
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  paypalPriceUsd: string;
};

const emptyForm = (courseId = ''): RunForm => ({
  courseId,
  code: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Ho_Chi_Minh',
  capacity: '',
  enrollmentStartDate: '',
  enrollmentEndDate: '',
  paypalPriceUsd: '',
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  onCreated?: (run: CourseRunResponse) => void;
};

export function CreateCourseRunSheet({ open, onOpenChange, courseId, onCreated }: Props) {
  const queryClient = useQueryClient();
  // Reset form/state each time the sheet (re)opens by remounting via a key on `open`.
  // `openKey` increments on every open transition so the form starts empty without
  // syncing state inside an effect (avoids react-hooks/set-state-in-effect).
  const [openKey, setOpenKey] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setOpenKey((key) => key + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <CreateCourseRunSheetBody
      key={openKey}
      open={open}
      onOpenChange={onOpenChange}
      courseId={courseId}
      onCreated={onCreated}
      queryClient={queryClient}
    />
  );
}

function CreateCourseRunSheetBody({
  open,
  onOpenChange,
  courseId,
  onCreated,
  queryClient,
}: Props & { queryClient: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState<RunForm>(emptyForm(courseId ?? ''));
  const [courseError, setCourseError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const requiredFilled =
    Boolean(courseId ?? form.courseId) &&
    form.code.trim() !== '' &&
    form.status.trim() !== '' &&
    form.startsAt.trim() !== '' &&
    form.endsAt.trim() !== '';

  const isDirty = useMemo(() => {
    const initial = emptyForm(courseId ?? '');
    return (Object.keys(initial) as Array<keyof RunForm>).some(
      (field) => form[field] !== initial[field],
    );
  }, [form, courseId]);

  useBeforeUnload(open && isDirty);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmDiscard(isDirty)) {
      return;
    }
    onOpenChange(next);
  };

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.getPage(0, 100),
    enabled: open && !courseId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const targetCourseId = courseId ?? form.courseId;
      if (!targetCourseId) {
        setCourseError('Select a course.');
        throw new Error('Missing course.');
      }
      return courseRunsApi.create({
        courseId: targetCourseId,
        code: form.code,
        status: form.status,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        timezone: form.timezone,
        metadata: mergeCourseRunPricingMetadata(null, form.paypalPriceUsd),
        capacity: form.capacity ? Number(form.capacity) : null,
        enrollmentStartDate: form.enrollmentStartDate
          ? new Date(form.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: form.enrollmentEndDate
          ? new Date(form.enrollmentEndDate).toISOString()
          : null,
      });
    },
    onSuccess: async (created) => {
      toast.success('Course run created.');
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
      if (courseId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.list(courseId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      }
      onCreated?.(created);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
          <SheetTitle>Create new course run</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!courseId ? (
            <div className="space-y-2">
              <Label>
                Course <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.courseId || undefined}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, courseId: value }));
                  setCourseError('');
                }}
              >
                <SelectTrigger
                  aria-invalid={Boolean(courseError) || (touched.courseId && !form.courseId)}
                  onBlur={() => markTouched('courseId')}
                >
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {(coursesQuery.data?.data ?? []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} — {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courseError ? (
                <p className="text-destructive text-sm">{courseError}</p>
              ) : touched.courseId && !form.courseId ? (
                <p className="text-destructive text-sm">Select a course.</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>
              Class code <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.code}
              aria-invalid={touched.code && form.code.trim() === ''}
              onBlur={() => markTouched('code')}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
            {touched.code && form.code.trim() === '' ? (
              <p className="text-destructive text-sm">Class code is required.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Start <span className="text-destructive">*</span>
              </Label>
              <DateTimePicker
                value={form.startsAt}
                onChange={(startsAt) => {
                  markTouched('startsAt');
                  setForm((prev) => ({ ...prev, startsAt }));
                }}
              />
              {touched.startsAt && form.startsAt.trim() === '' ? (
                <p className="text-destructive text-sm">Start date is required.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>
                End <span className="text-destructive">*</span>
              </Label>
              <DateTimePicker
                value={form.endsAt}
                onChange={(endsAt) => {
                  markTouched('endsAt');
                  setForm((prev) => ({ ...prev, endsAt }));
                }}
              />
              {touched.endsAt && form.endsAt.trim() === '' ? (
                <p className="text-destructive text-sm">End date is required.</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Open enrollment</Label>
              <DateTimePicker
                value={form.enrollmentStartDate}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, enrollmentStartDate: value }))
                }
              />
              <p className="text-muted-foreground text-xs">When students can start enrolling.</p>
            </div>
            <div className="space-y-2">
              <Label>Close enrollment</Label>
              <DateTimePicker
                value={form.enrollmentEndDate}
                onChange={(value) => setForm((prev) => ({ ...prev, enrollmentEndDate: value }))}
              />
              <p className="text-muted-foreground text-xs">When enrollment closes.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
            />
            <p className="text-muted-foreground text-xs">
              Maximum learners. Leave blank for unlimited.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Checkout pricing</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Set one global checkout price in USD. Leave blank if this run should stay free.
            </p>
            <div className="mt-4 space-y-2">
              <Label>Global price (USD)</Label>
              <Input
                inputMode="decimal"
                placeholder="19.99"
                value={form.paypalPriceUsd}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paypalPriceUsd: e.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Students pay this once via checkout. Leave blank for free.
              </p>
            </div>
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!requiredFilled || createMutation.isPending}
          >
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
