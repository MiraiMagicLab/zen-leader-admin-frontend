import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState<RunForm>(emptyForm(courseId ?? ''));
  const [courseError, setCourseError] = useState('');

  const coursesQuery = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => coursesApi.getPage(0, 100),
    enabled: open && !courseId,
  });

  useEffect(() => {
    if (open) {
      setForm(emptyForm(courseId ?? ''));
      setCourseError('');
    }
  }, [open, courseId]);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
          <SheetTitle>Create new course run</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!courseId ? (
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={form.courseId || undefined}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, courseId: value }));
                  setCourseError('');
                }}
              >
                <SelectTrigger aria-invalid={Boolean(courseError)}>
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
              {courseError ? <p className="text-destructive text-sm">{courseError}</p> : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Class code</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
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
              <Label>Start</Label>
              <DateTimePicker
                value={form.startsAt}
                onChange={(startsAt) => setForm((prev) => ({ ...prev, startsAt }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <DateTimePicker
                value={form.endsAt}
                onChange={(endsAt) => setForm((prev) => ({ ...prev, endsAt }))}
              />
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
            </div>
            <div className="space-y-2">
              <Label>Close enrollment</Label>
              <DateTimePicker
                value={form.enrollmentEndDate}
                onChange={(value) => setForm((prev) => ({ ...prev, enrollmentEndDate: value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
            />
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
            </div>
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
