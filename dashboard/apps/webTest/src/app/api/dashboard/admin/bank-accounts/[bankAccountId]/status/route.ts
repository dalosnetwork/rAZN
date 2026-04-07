import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    bankAccountId: string;
  }>;
};

function encodePath(bankAccountId: string) {
  return `/dashboard/admin/bank-accounts/${encodeURIComponent(bankAccountId)}/status`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { bankAccountId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(bankAccountId),
    method: "PATCH",
    body,
  });
}
