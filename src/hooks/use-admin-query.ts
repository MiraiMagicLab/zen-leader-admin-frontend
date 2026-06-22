import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';

type AdminQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

/** Wrapper useQuery — inherits no-cache defaults from queryClient */
export function useAdminQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: AdminQueryOptions<TData>,
) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}
