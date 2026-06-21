import { apiGet, apiPost, apiPut } from '@/services/lib/api-request';
import type {
  AdminBanUserRequest,
  AdminCreateUserRequest,
  AdminUpdateUserRolesRequest,
  AdminUpdateUserStatusRequest,
  UserResponse,
} from '@/services/types/domain';

/** Backend Jackson serializes `isActive`/`isVerified` as `active`/`verified`. */
type UserResponseRaw = UserResponse & {
  active?: boolean;
  verified?: boolean;
};

function normalizeUser(user: UserResponseRaw): UserResponse {
  return {
    ...user,
    isActive: user.isActive ?? user.active ?? false,
    isVerified: user.isVerified ?? user.verified ?? false,
    roles: user.roles ?? [],
  };
}

export async function createUserApi(
  payload: AdminCreateUserRequest,
): Promise<UserResponse> {
  const user = await apiPost<UserResponseRaw>('/api/v1/admin/users', payload);
  return normalizeUser(user);
}

export async function updateUserStatusApi(
  userId: string,
  payload: AdminUpdateUserStatusRequest,
): Promise<UserResponse> {
  const user = await apiPut<UserResponseRaw>(
    `/api/v1/admin/users/${userId}/status`,
    payload,
  );
  return normalizeUser(user);
}

export async function banUserApi(
  userId: string,
  payload: AdminBanUserRequest,
): Promise<UserResponse> {
  const user = await apiPut<UserResponseRaw>(
    `/api/v1/admin/users/${userId}/ban`,
    payload,
  );
  return normalizeUser(user);
}

export async function updateUserRolesApi(
  userId: string,
  payload: AdminUpdateUserRolesRequest,
): Promise<UserResponse> {
  const user = await apiPut<UserResponseRaw>(
    `/api/v1/admin/users/${userId}/roles`,
    payload,
  );
  return normalizeUser(user);
}

export async function getUserByIdApi(userId: string): Promise<UserResponse> {
  const user = await apiGet<UserResponseRaw>(`/api/v1/admin/users/${userId}`);
  return normalizeUser(user);
}

export async function getUsersApi(params: {
  page?: number;
  size?: number;
  field?: string;
  direction?: string;
  keyword?: string;
  role?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 1));
  search.set('size', String(params.size ?? 10));
  if (params.field) search.set('field', params.field);
  if (params.direction) search.set('direction', params.direction);
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.role && params.role !== 'all') search.set('role', params.role);
  if (params.status && params.status !== 'all') search.set('status', params.status);
  const page = await apiGet<
    import('@/services/types/pagination').PagingResponse<UserResponseRaw>
  >(`/api/v1/admin/users?${search.toString()}`);
  return {
    ...page,
    data: page.data.map(normalizeUser),
  };
}
