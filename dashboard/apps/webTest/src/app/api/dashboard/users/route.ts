import { proxyApiRequest } from "../../_utils/proxy-api";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.toString();
  const path = query ? `/dashboard/users?${query}` : "/dashboard/users";

  return proxyApiRequest(request, {
    path,
    method: "GET",
  });
}
