import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mergeCourseRunPricingMetadata } from '@/lib/course-run-pricing';
import {
  APPLE_PRODUCT_ID_REQUIRED_NOTE,
  getOpenRunBlockedMessage,
  hasAppleProductId,
} from '@/lib/apple-product-requirement';
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
    queryFn: () => coursesApi.getAll(),
    enabled: open && !courseId,
  });

  const targetCourseId = courseId ?? form.courseId;
  const courseDetailQuery = useQuery({
    queryKey: queryKeys.courses.detail(targetCourseId),
    queryFn: () => coursesApi.getById(targetCourseId),
    enabled: open && Boolean(targetCourseId),
  });
  const selectedCourse =
    courseDetailQuery.data ??
    coursesQuery.data?.data?.find((item) => item.id === targetCourseId) ??
    null;
  const appleReady = hasAppleProductId(selectedCourse);

  const createMutation = useMutation({
    mutationFn: () => {
      const resolvedCourseId = courseId ?? form.courseId;
      if (!resolvedCourseId) {
        setCourseError('Select a course.');
        throw new Error('Missing course.');
      }
      const blocked = getOpenRunBlockedMessage(selectedCourse, form.status);
      if (blocked) {
        throw new Error(blocked);
      }
      return courseRunsApi.create({
        courseId: resolvedCourseId,
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
    <AdminEditorDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Create new course run"
      size="lg"
      footer={
        <AdminFormDialogFooter
          onCancel={() => handleOpenChange(false)}
          submitLabel="Create"
          onSubmit={() => createMutation.mutate()}
          pending={createMutation.isPending}
          disabled={!requiredFilled}
        />
      }
    >
      <div className="space-y-4">
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
                  {(coursesQuery.data ?? []).map((course) => (
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
                <SelectItem value="OPEN" disabled={!appleReady}>
                  OPEN
                </SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
            {!appleReady ? (
              <p className="text-muted-foreground text-sm">{APPLE_PRODUCT_ID_REQUIRED_NOTE}</p>
            ) : null}
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
    </AdminEditorDialog>
  );
}
