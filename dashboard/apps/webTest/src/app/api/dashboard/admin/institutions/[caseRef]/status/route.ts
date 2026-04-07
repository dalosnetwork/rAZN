import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    caseRef: string;
  }>;
};

function encodePath(caseRef: string) {
  return `/dashboard/admin/institutions/${encodeURIComponent(caseRef)}/status`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseRef } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(caseRef),
    method: "PATCH",
    body,
  });
}
