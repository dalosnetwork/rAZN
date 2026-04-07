type ApiErrorPayload = {
  message?: string;
  error?: {
    message?: string;
  };
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
};

export type DashboardUsersPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DashboardUsersSortBy =
  | "name"
  | "email"
  | "createdAt"
  | "emailVerified";
export type DashboardUsersSortDirection = "asc" | "desc";

export type DashboardUsersResponse = {
  rows?: DashboardUser[];
  pagination?: DashboardUsersPagination;
  sorting?: {
    sortBy: DashboardUsersSortBy;
    sortDirection: DashboardUsersSortDirection;
  };
  row?: DashboardUser;
  success?: boolean;
};

function getErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  return payload?.error?.message ?? payload?.message ?? fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export type DashboardUsersParams = {
  page: number;
  pageSize: number;
  sortBy: DashboardUsersSortBy;
  sortDir: DashboardUsersSortDirection;
};

export async function getDashboardUsers(
  params: DashboardUsersParams,
): Promise<{
  rows: DashboardUser[];
  pagination: DashboardUsersPagination;
  sorting: {
    sortBy: DashboardUsersSortBy;
    sortDirection: DashboardUsersSortDirection;
  };
}> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });

  const response = await fetch(`/api/dashboard/users?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<ApiErrorPayload & DashboardUsersResponse>(
    response,
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to fetch users"));
  }

  return {
    rows: payload.rows ?? [],
    pagination: payload.pagination ?? {
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 1,
    },
    sorting: payload.sorting ?? {
      sortBy: params.sortBy,
      sortDirection: params.sortDir,
    },
  };
}

export type UpdateDashboardUserInput = {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  roleSlugs?: string[];
};

export async function updateDashboardUser(
  userId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUser> {
  const response = await fetch(`/api/dashboard/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & DashboardUsersResponse>(
    response,
  );
  if (!response.ok || !payload.row) {
    throw new Error(getErrorMessage(payload, "Failed to update user"));
  }

  return payload.row;
}

export async function disableDashboardUser(userId: string): Promise<boolean> {
  const response = await fetch(`/api/dashboard/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    credentials: "include",
  });

  const payload = await parseJson<ApiErrorPayload & DashboardUsersResponse>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to disable user"));
  }

  return payload.success ?? true;
}
