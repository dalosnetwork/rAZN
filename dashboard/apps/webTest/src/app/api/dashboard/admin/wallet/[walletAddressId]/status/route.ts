import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    walletAddressId: string;
  }>;
};

function encodePath(walletAddressId: string) {
  return `/dashboard/admin/wallet/${encodeURIComponent(walletAddressId)}/status`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { walletAddressId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(walletAddressId),
    method: "PATCH",
    body,
  });
}
