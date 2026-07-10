import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { queryKeys } from '@/hooks/query-keys';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { confirmDiscard } from '@/lib/confirm-discard';
import { getPayPalPriceUsd, mergeCourseRunPricingMetadata } from '@/lib/course-run-pricing';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseRunResponse } from '@/services/types/domain';

type RunSettingsForm = {
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

function toRunSettingsForm(run: CourseRunResponse): RunSettingsForm {
  return {
    code: run.code,
    status: run.status,
    startsAt: run.startsAt ? toLocalDateTimeFromIso(run.startsAt) : '',
    endsAt: run.endsAt ? toLocalDateTimeFromIso(run.endsAt) : '',
    timezone: run.timezone ?? 'Asia/Ho_Chi_Minh',
    capacity: run.capacity != null ? String(run.capacity) : '',
    paypalPriceUsd: getPayPalPriceUsd(run.metadata),
    enrollmentStartDate: run.enrollmentStartDate
      ? toLocalDateTimeFromIso(run.enrollmentStartDate)
      : '',
    enrollmentEndDate: run.enrollmentEndDate
      ? toLocalDateTimeFromIso(run.enrollmentEndDate)
      : '',
  };
}

type CourseRunSettingsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: CourseRunResponse;
};

/**
 * Run settings sheet for the course run detail page. Owns the settings form state
 * and the update-run mutation; remounts (via `key`) each time it opens so the form
 * always starts from the latest `run` values.
 */
export function CourseRunSettingsPanel({ open, onOpenChange, run }: CourseRunSettingsPanelProps) {
  const [openKey, setOpenKey] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setOpenKey((key) => key + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <CourseRunSettingsPanelBody key={openKey} open={open} onOpenChange={onOpenChange} run={run} />
  );
}

function CourseRunSettingsPanelBody({ open, onOpenChange, run }: CourseRunSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [runSettings, setRunSettings] = useState<RunSettingsForm>(() => toRunSettingsForm(run));

  const runSettingsBaseline = toRunSettingsForm(run);
  const runSettingsDirty = (Object.keys(runSettings) as Array<keyof RunSettingsForm>).some(
    (field) => runSettings[field] !== runSettingsBaseline[field],
  );

  useBeforeUnload(open && runSettingsDirty);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmDiscard(runSettingsDirty)) {
      return;
    }
    onOpenChange(next);
  };

  const updateRunMutation = useMutation({
    mutationFn: () =>
      courseRunsApi.update(run.id, {
        courseId: run.courseId,
        code: runSettings.code,
        status: runSettings.status,
        startsAt: new Date(runSettings.startsAt).toISOString(),
        endsAt: new Date(runSettings.endsAt).toISOString(),
        timezone: runSettings.timezone,
        metadata: mergeCourseRunPricingMetadata(run.metadata, runSettings.paypalPriceUsd),
        capacity: runSettings.capacity ? Number(runSettings.capacity) : null,
        enrollmentStartDate: runSettings.enrollmentStartDate
          ? new Date(runSettings.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: runSettings.enrollmentEndDate
          ? new Date(runSettings.enrollmentEndDate).toISOString()
          : null,
      }),
    onSuccess: async () => {
      toast.success('Course run updated.');
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.detail(run.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(run.courseId) }),
      ]);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
          <SheetTitle>Course run settings</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label>
              Class code <span className="text-destructive">*</span>
            </Label>
            <Input
              value={runSettings.code}
              aria-invalid={runSettings.code.trim() === ''}
              onChange={(event) =>
                setRunSettings((current) => ({ ...current, code: event.target.value }))
              }
            />
            {runSettings.code.trim() === '' ? (
              <p className="text-destructive text-sm">Class code is required.</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={runSettings.status}
                onValueChange={(value) =>
                  setRunSettings((current) => ({ ...current, status: value }))
                }
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
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                value={runSettings.capacity}
                onChange={(event) =>
                  setRunSettings((current) => ({ ...current, capacity: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Checkout pricing</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Set one global USD price on this run so checkout can create the correct payment order.
            </p>
            <div className="mt-4 space-y-2">
              <Label>Global price (USD)</Label>
              <Input
                inputMode="decimal"
                placeholder="19.99"
                value={runSettings.paypalPriceUsd}
                onChange={(event) =>
                  setRunSettings((current) => ({
                    ...current,
                    paypalPriceUsd: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Start <span className="text-destructive">*</span>
              </Label>
              <DateTimePicker
                value={runSettings.startsAt}
                onChange={(startsAt) =>
                  setRunSettings((current) => ({ ...current, startsAt }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                End <span className="text-destructive">*</span>
              </Label>
              <DateTimePicker
                value={runSettings.endsAt}
                onChange={(endsAt) => setRunSettings((current) => ({ ...current, endsAt }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Open enrollment</Label>
              <DateTimePicker
                value={runSettings.enrollmentStartDate}
                onChange={(enrollmentStartDate) =>
                  setRunSettings((current) => ({ ...current, enrollmentStartDate }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Close enrollment</Label>
              <DateTimePicker
                value={runSettings.enrollmentEndDate}
                onChange={(enrollmentEndDate) =>
                  setRunSettings((current) => ({ ...current, enrollmentEndDate }))
                }
              />
            </div>
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            onClick={() => updateRunMutation.mutate()}
            disabled={
              updateRunMutation.isPending ||
              runSettings.code.trim() === '' ||
              runSettings.status.trim() === '' ||
              runSettings.startsAt.trim() === '' ||
              runSettings.endsAt.trim() === ''
            }
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
