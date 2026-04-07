import { proxyApiRequest } from "../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function encodeUserPath(userId: string) {
  return `/dashboard/users/${encodeURIComponent(userId)}`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { userId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodeUserPath(userId),
    method: "PATCH",
    body,
  });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { userId } = await context.params;

  return proxyApiRequest(request, {
    path: encodeUserPath(userId),
    method: "DELETE",
  });
}
