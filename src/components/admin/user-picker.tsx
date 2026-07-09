import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  selectedUsers: UserResponse[];
  onSelectedUsersChange: (users: UserResponse[]) => void;
  label?: string;
  /** Reset search and reload list when dialog opens */
  open?: boolean;
};

export function UserPicker({
  selectedUsers,
  onSelectedUsersChange,
  label = 'Select users',
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
    enabled: open,
  });

  const users = usersQuery.data?.data ?? [];
  const selectedIds = new Set(selectedUsers.map((user) => user.id));

  const toggleUser = (user: UserResponse) => {
    if (selectedIds.has(user.id)) {
      onSelectedUsersChange(selectedUsers.filter((item) => item.id !== user.id));
      return;
    }
    onSelectedUsersChange([...selectedUsers, user]);
  };

  const removeUser = (userId: string) => {
    onSelectedUsersChange(selectedUsers.filter((item) => item.id !== userId));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Filter by email or name…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {selectedUsers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            Selected {selectedUsers.length} learner{selectedUsers.length === 1 ? '' : 's'}
          </p>
          <ul className="max-h-36 overflow-y-auto rounded-md border divide-y bg-background">
            {selectedUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs hover:bg-muted/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{user.displayName}</p>
                  <p className="text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive rounded-md p-1 hover:bg-muted transition-colors cursor-pointer shrink-0"
                  aria-label={`Remove ${user.displayName}`}
                  onClick={() => removeUser(user.id)}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {usersQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
          {users.length === 0 ? (
            <li className="text-muted-foreground px-2 py-3 text-center text-sm">
              {search ? 'No users found.' : 'No users yet.'}
            </li>
          ) : (
            users.map((user) => {
              const checked = selectedIds.has(user.id);
              return (
                <li key={user.id}>
                  <label
                    className={cn(
                      'hover:bg-muted flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      checked && 'bg-muted/60',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleUser(user)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    </div>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      )}

      {!usersQuery.isLoading && users.length > 0 && !search ? (
        <p className="text-muted-foreground text-xs">
          Showing {users.length} most recent users. Type to filter more.
        </p>
      ) : null}

      {selectedUsers.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0"
          onClick={() => onSelectedUsersChange([])}
        >
          Clear selection
        </Button>
      ) : null}
    </div>
  );
}
