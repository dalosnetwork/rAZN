import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    requestRef: string;
  }>;
};

function encodePath(requestRef: string) {
  return `/dashboard/admin/mint-ops/${encodeURIComponent(requestRef)}/status`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { requestRef } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(requestRef),
    method: "PATCH",
    body,
  });
}
