import { proxyApiRequest } from "../_utils/proxy-api";

export async function POST(request: Request): Promise<Response> {
  return proxyApiRequest(request, {
    path: "/auth/logout",
    method: "POST",
  });
}
