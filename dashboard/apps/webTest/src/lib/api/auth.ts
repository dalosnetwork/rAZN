export type LoginInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
  callbackURL?: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
};

type ApiErrorPayload = {
  message?: string;
  error?: {
    message?: string;
  };
};

export type MeUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  avatar?: string | null;
  emailVerified?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MeAccess = {
  roleSlugs: string[];
  permissionKeys: string[];
};

type MeResponse = {
  user: MeUser;
  session: unknown;
  access: MeAccess;
};

function getErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  return payload?.error?.message ?? payload?.message ?? fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export async function login(input: LoginInput) {
  const response = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Login failed"));
  }

  return payload;
}

export async function register(input: RegisterInput) {
  const response = await fetch("/api/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Registration failed"));
  }

  return payload;
}

export async function getMe(): Promise<MeResponse | null> {
  const response = await fetch("/api/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  const payload = await parseJson<ApiErrorPayload & MeResponse>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to get current user"));
  }

  if (!payload.user) {
    return null;
  }

  const access = payload.access ?? {
    roleSlugs: [],
    permissionKeys: [],
  };

  return {
    user: payload.user,
    session: payload.session,
    access,
  };
}

export async function logout() {
  const response = await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });

  const payload = await parseJson<ApiErrorPayload>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Logout failed"));
  }

  return payload;
}
