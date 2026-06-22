import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/query-keys';
import { cn } from '@/lib/utils';
import { getUsersApi } from '@/services/users/users-api';
import type { UserResponse } from '@/services/types/domain';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 12;

type UserPickerProps = {
  selectedUser: UserResponse | null;
  onSelect: (user: UserResponse | null) => void;
  label?: string;
  /** Reset search and reload list when dialog opens */
  open?: boolean;
};

export function UserPicker({
  selectedUser,
  onSelect,
  label = 'Select user',
  open = true,
}: UserPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setKeyword('');
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(keyword.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ page: 1, keyword: search, picker: true }),
    queryFn: () =>
      getUsersApi({
        page: 1,
        size: PAGE_SIZE,
        keyword: search || undefined,
      }),
    enabled: open && !selectedUser,
  });

  const users = usersQuery.data?.data ?? [];

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div>
            <p className="font-medium">{selectedUser.displayName}</p>
            <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Filter by email or name…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          {usersQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <ul className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-1">
              {users.length === 0 ? (
                <li className="text-muted-foreground px-2 py-3 text-center text-sm">
                  {search ? 'No users found.' : 'No users yet.'}
                </li>
              ) : (
                users.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={cn(
                        'hover:bg-muted w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      )}
                      onClick={() => onSelect(user)}
                    >
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-muted-foreground text-xs">{user.email}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {!usersQuery.isLoading && users.length > 0 && !search ? (
            <p className="text-muted-foreground text-xs">
              Showing {users.length} most recent users. Type to filter more.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
