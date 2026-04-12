import { proxyApiRequest } from "../../_utils/proxy-api";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.toString();
  const path = query
    ? `/dashboard/notifications?${query}`
    : "/dashboard/notifications";

  return proxyApiRequest(request, {
    path,
    method: "GET",
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  return proxyApiRequest(request, {
    path: "/dashboard/notifications/read",
    method: "PATCH",
    body: payload ?? {},
  });
}
