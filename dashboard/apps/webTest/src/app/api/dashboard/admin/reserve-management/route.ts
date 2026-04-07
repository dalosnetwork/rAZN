import { proxyApiRequest } from "../../../_utils/proxy-api";

export async function GET(request: Request): Promise<Response> {
  return proxyApiRequest(request, {
    path: "/dashboard/admin/reserve-management",
    method: "GET",
  });
}
