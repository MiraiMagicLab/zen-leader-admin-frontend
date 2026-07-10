import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';

import { AdminDetailSkeleton, AdminQueryError } from '@/components/admin/admin-query-state';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { syllabusItemsApi, syllabusSectionsApi } from '@/services/lms/lms-api';

/**
 * Thin redirect page for the legacy `/syllabus-items/:itemId` deep link.
 *
 * Syllabus items are only ever managed from within their parent course's
 * "Syllabus" workspace section, so this page resolves the item's course and
 * immediately navigates there instead of rendering a standalone editor.
 */
export function SyllabusItemDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.syllabusItem);

  const { itemId } = useParams();

  const itemQuery = useQuery({
    queryKey: queryKeys.syllabusItems.detail(itemId ?? ''),
    queryFn: () => syllabusItemsApi.getById(itemId!),
    enabled: Boolean(itemId),
  });

  const syllabusSectionId = itemQuery.data?.syllabusSectionId;

  const sectionQuery = useQuery({
    queryKey: queryKeys.syllabusSections.detail(syllabusSectionId ?? ''),
    queryFn: () => syllabusSectionsApi.getById(syllabusSectionId!),
    enabled: Boolean(syllabusSectionId),
  });

  if (!itemId) {
    return <Navigate to={ROUTES.courses} replace />;
  }

  if (itemQuery.isError || sectionQuery.isError) {
    return (
      <div className="space-y-6">
        <AdminQueryError
          title="Could not open this lesson"
          message={getApiErrorMessage(itemQuery.error ?? sectionQuery.error)}
          onRetry={() => {
            void itemQuery.refetch();
            void sectionQuery.refetch();
          }}
        />
      </div>
    );
  }

  const courseId = sectionQuery.data?.courseId;
  if (courseId) {
    return <Navigate to={ROUTES.courseDetail(courseId, 'syllabus', itemId)} replace />;
  }

  return <AdminDetailSkeleton />;
}
